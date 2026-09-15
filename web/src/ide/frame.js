/**
 * The app frame: five destinations, an app bar per screen, one set of chrome
 * (doc/shell-redesign.md §3.1, §4.1).
 *
 * This replaces `IdeNavbar`. That was a react-bootstrap Navbar with `expand="lg"`,
 * so below 992 px — every phone — the IDE and the DB Manager were a title, a
 * hamburger, and an empty page.
 */

import { html, useState } from "acelery/ui.js";
import { href, navigate, up } from "./router.js";
import { Icon, IconButton } from "./parts.js";

export const DESTINATIONS = [
  { key: "home", path: [], label: "Home", icon: "fa-solid fa-house" },
  { key: "apps", path: ["apps"], label: "Apps", icon: "fa-solid fa-table-cells" },
  { key: "code", path: ["code"], label: "Code", icon: "fa-solid fa-code" },
  { key: "data", path: ["data"], label: "Data", icon: "fa-solid fa-database" },
  { key: "settings", path: ["settings"], label: "Settings", icon: "fa-solid fa-gear" },
];

function NavItems({ section }) {
  return DESTINATIONS.map(
    (d) => html`
      <a key=${d.key} href=${href(d.path)}
         class=${`ac-navitem${d.key === "settings" ? " is-settings" : ""}`}
         aria-current=${section === d.key ? "page" : undefined}
         onClick=${(e) => {
           // Leave modified clicks to the browser: a new tab is a real use in
           // a desktop browser.
           if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
           e.preventDefault();
           // Across, not down: replace, so Back does not replay every tab (§3.3).
           navigate(d.path, { replace: true });
         }}>
        <span class="ac-navicon"><${Icon} name=${d.icon} /></span>
        <span class="ac-navlabel">${d.label}</span>
      </a>`,
  );
}

/**
 * A bottom navigation bar below 768 px and a rail from 768 px. Both are in the
 * markup and CSS shows one; `display: none` also takes the hidden one out of the
 * accessibility tree, so there is only ever one "Main" landmark in play.
 */
export function AppFrame({ section, children }) {
  return html`
    <div class="ac-frame">
      <nav class="ac-rail" aria-label="Main">
        <div class="ac-brand">
          <span class="ac-brand-mark" aria-hidden="true">
            <${Icon} name="fa-solid fa-seedling" />
          </span>
          <span class="ac-brand-name">aCelery</span>
        </div>
        <${NavItems} section=${section} />
      </nav>
      <main class="ac-main">${children}</main>
      <nav class="ac-bottomnav" aria-label="Main">
        <${NavItems} section=${section} />
      </nav>
    </div>`;
}

/**
 * One screen: an app bar, optionally a sub-bar (tabs), the content, and a FAB.
 *
 * @param {object} p
 * @param {string|object} p.title
 * @param {string} [p.subtitle]
 * @param {string[]} [p.back]    the parent route; omit on a destination's home
 * @param {object} [p.actions]   app bar buttons, rightmost last
 * @param {object} [p.subbar]
 * @param {{icon:string,label:string,onClick:Function}} [p.fab]
 * @param {boolean} [p.fill]     content fills the row and does not scroll
 */
export function Screen({ title, subtitle, back, actions, subbar, fab, fill, children }) {
  const [scrolled, setScrolled] = useState(false);

  return html`
    <section class="ac-screen" aria-labelledby="ac-screen-title">
      <header class=${`ac-appbar${back ? "" : " no-back"}${scrolled ? " is-scrolled" : ""}${subbar ? " has-subbar" : ""}`}>
        ${back
          ? html`<${IconButton} icon="fa-solid fa-arrow-left" label="Back"
                   onClick=${() => up(back)} />`
          : null}
        <div class="ac-appbar-titles">
          <h1 class="ac-appbar-title" id="ac-screen-title">${title}</h1>
          ${subtitle ? html`<div class="ac-appbar-subtitle">${subtitle}</div>` : null}
        </div>
        <div class="ac-appbar-actions">${actions ?? null}</div>
      </header>
      ${subbar ? html`<div class="ac-subbar">${subbar}</div>` : null}
      ${fill
        ? html`<div class="ac-content is-fill">${children}</div>`
        : html`
            <div class=${`ac-content${fab ? " has-fab" : ""}`}
                 onScroll=${(e) => setScrolled(e.currentTarget.scrollTop > 0)}>
              <div class="ac-content-inner">${children}</div>
            </div>`}
      ${fab
        ? html`
            <button type="button" class="ac-fab" aria-label=${fab.label}
                    onClick=${fab.onClick}>
              <${Icon} name=${fab.icon} />
              <span class="ac-fab-label" aria-hidden="true">${fab.label}</span>
            </button>`
        : null}
    </section>`;
}
