/**
 * Tests the BUILT widget layer, not the sources.
 *
 * bundle/www/tools/js/acelery/ui.js is what ships, and the failure this suite
 * exists for — two copies of preact core, so hooks register their options on a
 * different instance than the one rendering — only appears after bundling. It
 * kills the first render with "Cannot read properties of undefined (reading
 * 'context')" inside useBootstrapPrefix, and the stack points nowhere near the
 * cause.
 *
 * Run with: cd web && npm test
 */

import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id=root></div></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Node = dom.window.Node;
globalThis.Element = dom.window.Element;
globalThis.Event = dom.window.Event;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);

const ui = await import("../../bundle/www/tools/js/acelery/ui.js");
const { html, render } = ui;

/** Renders into a fresh container and returns it. */
function mount(vnode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  render(vnode, host);
  return host;
}

/** Preact batches; let its queue drain. */
const flush = () => new Promise((r) => setTimeout(r, 0));

function fire(el, type, init = {}) {
  el.dispatchEvent(new dom.window.Event(type, { bubbles: true, ...init }));
}

test("the bundle renders at all — one copy of preact, hooks wired", () => {
  // If two preact cores shipped, this throws inside useBootstrapPrefix.
  const host = mount(html`<${ui.Button} variant="primary">Save<//>`);
  const button = host.querySelector("button");
  assert.ok(button, "no button rendered");
  assert.equal(button.className, "btn btn-primary");
});

test("Panel emits the card markup xbTitlePanel built by hand", () => {
  const host = mount(html`<${ui.Panel} title="Directory">body<//>`);
  assert.equal(host.querySelector(".card-header").textContent, "Directory");
  assert.equal(host.querySelector(".card-body").textContent, "body");
});

test("a Panel title is text, not markup", () => {
  // xbTitlePanel interpolated the title into a string of HTML (§7.4).
  const host = mount(html`<${ui.Panel} title="<img src=x onerror=1>">b<//>`);
  assert.equal(host.querySelector(".card-header img"), null);
  assert.match(host.querySelector(".card-header").textContent, /<img/);
});

test("Input pairs its label to its control by id", () => {
  // xscript.js wired <label for> at only 5 sites across both files (§7.3).
  const host = mount(html`<${ui.Input} label="Name" name="mname" />`);
  const label = host.querySelector("label");
  const input = host.querySelector("input");
  assert.ok(label.getAttribute("for"));
  assert.equal(label.getAttribute("for"), input.id);
  assert.equal(input.name, "mname");
  assert.equal(host.querySelector(".mb-3").className.includes("mb-3"), true);
});

test("two Inputs do not share an id", () => {
  const host = mount(html`
    <div>
      <${ui.Input} label="A" name="a" />
      <${ui.Input} label="B" name="b" />
    </div>`);
  const [first, second] = host.querySelectorAll("input");
  assert.notEqual(first.id, second.id);
});

test("Select renders both option shapes", () => {
  const host = mount(html`
    <${ui.Select} label="Group" name="grp"
      options=${[{ label: "Staff", value: "s" }, "other"]} />`);
  const options = [...host.querySelectorAll("option")];
  assert.deepEqual(options.map((o) => o.value), ["s", "other"]);
  assert.deepEqual(options.map((o) => o.textContent), ["Staff", "other"]);
});

test("Select can carry a placeholder", () => {
  const host = mount(html`
    <${ui.Select} name="g" placeholder="Choose…" options=${["a"]} />`);
  assert.equal(host.querySelectorAll("option").length, 2);
  assert.equal(host.querySelector("option").value, "");
});

test("Form collects its fields' values on submit", async () => {
  let collected = null;
  const host = mount(html`
    <${ui.Form} initial=${{ mname: "Ada" }} onSubmit=${(v) => (collected = v)}>
      <${ui.Input} label="Name" name="mname" />
      <${ui.Input} label="Email" name="email" />
      <button type="submit">Save</button>
    <//>`);

  const email = host.querySelectorAll("input")[1];
  email.value = "ada@example.com";
  fire(email, "input");
  await flush();

  fire(host.querySelector("form"), "submit");
  await flush();

  assert.deepEqual(collected, { mname: "Ada", email: "ada@example.com" });
});

test("Form refuses to submit while a validator fails, and says why", async () => {
  let submitted = false;
  const host = mount(html`
    <${ui.Form} onSubmit=${() => (submitted = true)}>
      <${ui.Input} label="Name" name="mname"
                   validate=${[ui.notEmpty("Name is required")]} />
      <button type="submit">Save</button>
    <//>`);

  fire(host.querySelector("form"), "submit");
  await flush();

  assert.equal(submitted, false);
  assert.match(host.textContent, /Name is required/);
  assert.ok(host.querySelector("input").className.includes("is-invalid"));
});

test("fixing the field clears the error and lets the form through", async () => {
  let collected = null;
  const host = mount(html`
    <${ui.Form} onSubmit=${(v) => (collected = v)}>
      <${ui.Input} label="Name" name="mname" validate=${[ui.notEmpty()]} />
      <button type="submit">Save</button>
    <//>`);

  fire(host.querySelector("form"), "submit");
  await flush();
  assert.equal(collected, null);

  const input = host.querySelector("input");
  input.value = "Grace";
  fire(input, "input");
  await flush();

  fire(host.querySelector("form"), "submit");
  await flush();
  assert.deepEqual(collected, { mname: "Grace" });
});

test("the validators behave", () => {
  assert.equal(ui.notEmpty()(""), "Required");
  assert.equal(ui.notEmpty()("   "), "Required");
  assert.equal(ui.notEmpty()("x"), true);
  assert.equal(ui.notZero()(0), "Must not be zero");
  assert.equal(ui.notZero()(3), true);
  assert.equal(ui.email()("ada@example.com"), true);
  assert.equal(typeof ui.email()("nope"), "string");
  assert.equal(ui.email()(""), true, "empty is notEmpty's job, not email's");
  assert.equal(ui.tel()("+44 20 7946 0000"), true);
  assert.equal(typeof ui.maxLength(2)("abc"), "string");
  assert.equal(ui.maxLength(3)("abc"), true);
});

test("CheckBox reports a boolean, not a string", async () => {
  let collected = null;
  const host = mount(html`
    <${ui.Form} onSubmit=${(v) => (collected = v)}>
      <${ui.CheckBox} label="Active" name="active" />
      <button type="submit">Save</button>
    <//>`);

  const box = host.querySelector("input[type=checkbox]");
  box.checked = true;
  fire(box, "change");
  await flush();

  fire(host.querySelector("form"), "submit");
  await flush();
  assert.equal(collected.active, true);
});

test("Col stacks on a phone and splits from md up", () => {
  // xbLayout built a <table> of percentage-width <td>s, so there was no
  // responsive layout at all on a phone-first product (§3.4).
  const host = mount(html`
    <${ui.Row}><${ui.Col} span=${6}>a<//><${ui.Col} span=${6}>b<//><//>`);
  const cols = [...host.querySelectorAll(".row > div")];
  assert.equal(cols.length, 2);
  for (const col of cols) {
    assert.ok(col.className.includes("col-12"), col.className);
    assert.ok(col.className.includes("col-md-6"), col.className);
  }
});

test("applyTheme sets both attributes, and dark themes ask for dark mode", () => {
  ui.applyTheme("darkly");
  assert.equal(document.documentElement.getAttribute("data-acelery-theme"), "darkly");
  assert.equal(document.documentElement.getAttribute("data-bs-theme"), "dark");
  assert.equal(ui.isDark(), true);

  ui.applyTheme("acelery");
  assert.equal(document.documentElement.getAttribute("data-bs-theme"), "light");
  assert.equal(ui.currentTheme(), "acelery");
});

test("an unknown theme falls back rather than breaking the page", () => {
  assert.equal(ui.applyTheme("nonesuch"), "acelery");
});

test("every theme xbTheme offered is still on the list", () => {
  // Decision §9.6: all 18 survive, via CSS variables.
  assert.equal(ui.THEMES.length, 18);
  for (const t of ["acelery", "default", "paper", "readable", "cyborg"]) {
    assert.ok(ui.THEMES.includes(t), t);
  }
});

test("Modal, Tabs, Table and Navbar come through the re-export", () => {
  // The IDE needs these; a missing export is silent until the page runs.
  for (const name of [
    "Alert", "Badge", "Button", "ButtonGroup", "Dropdown", "DropdownButton",
    "Image", "ListGroup", "Modal", "Nav", "NavDropdown", "Navbar", "Offcanvas",
    "Pagination", "ProgressBar", "Spinner", "Tab", "Table", "Tabs",
  ]) {
    assert.equal(typeof ui[name], "function", `${name} is not exported`);
  }
});

test("a Modal renders its header and body", async () => {
  const host = mount(html`
    <${ui.Modal} show=${true} onHide=${() => {}}>
      <${ui.Modal.Header}><${ui.Modal.Title}>Confirm<//><//>
      <${ui.Modal.Body}>Delete it?<//>
    <//>`);
  await flush();
  // react-bootstrap portals the modal to document.body.
  assert.match(document.body.textContent, /Confirm/);
  assert.match(document.body.textContent, /Delete it\?/);
  render(null, host);
});
