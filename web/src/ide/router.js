/**
 * Routes for the shell (doc/shell-redesign.md §3.2, §6.2).
 *
 * The 2014 IDE, and the Phase 4 rewrite of it, kept which screen was showing in
 * component state. Nothing reached the URL, so Android Back — which walks the
 * WebView's history — left the IDE from inside the editor, and the reload the
 * host does after Run landed on the main menu with the project closed.
 *
 * A route is a hash, because the shell is one static page and a hash never
 * reaches the server. Entries are written with pushState rather than by
 * assigning `location.hash`, so each one can record where it was pushed from:
 * that is what lets the in-page back arrow tell "Back returns to my parent"
 * apart from "this is a deep link and there is nothing behind me".
 */

import { useState, useEffect } from "acelery/ui.js";

/** `#/code/Example/main.js` → `{ section: "code", parts: ["Example", "main.js"] }` */
export function parse(hash) {
  const parts = String(hash ?? "")
    .replace(/^#\/?/, "")
    .split("/")
    .filter(Boolean)
    .map(decode);
  return { section: parts[0] ?? "home", parts: parts.slice(1) };
}

function decode(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    // A hand-typed "%" is a name, not an error.
    return segment;
  }
}

/** `["code", "Example"]` → `#/code/Example`. Every segment is encoded. */
export function href(path) {
  return "#/" + path.map((p) => encodeURIComponent(p)).join("/");
}

const current = () => window.location.hash || "#/";

const listeners = new Set();
function notify() {
  for (const listener of listeners) listener(current());
}

let attached = false;
function attach() {
  if (attached) return;
  attached = true;
  // popstate for Back and forward; hashchange for a hash typed or linked.
  window.addEventListener("popstate", notify);
  window.addEventListener("hashchange", notify);
}

/* ------------------------------------------------------------------ guard */

/**
 * One screen at a time may need a say before the route changes — the editor,
 * with unsaved work. The guard resolves true to let navigation proceed.
 *
 * Only in-page navigation can be held up this way. Host Back and the browser's
 * Back arrive as popstate after the fact; the editor covers those by saving on
 * the way out, as `forceSaveFile()` always has.
 */
let guard = null;

export function setGuard(fn) {
  guard = fn;
  return () => {
    if (guard === fn) guard = null;
  };
}

/* ------------------------------------------------------------- navigation */

/**
 * Goes to a route. Down a level pushes history; across — the nav, the tabs —
 * replaces it, so Back does not replay every destination you touched (§3.3).
 */
export async function navigate(path, { replace = false } = {}) {
  const target = href(path);
  if (target === current()) return;
  if (guard && !(await guard())) return;

  if (replace) {
    window.history.replaceState({ from: window.history.state?.from ?? null }, "", target);
  } else {
    window.history.pushState({ from: current() }, "", target);
  }
  notify();
}

/**
 * The in-page back arrow. If this entry was pushed from the parent, Back is
 * exactly "up"; otherwise — a deep link, a reload, a stale Continue card — go
 * to the parent without leaving a dead entry behind.
 */
export async function up(parentPath) {
  const parent = href(parentPath);
  if (window.history.state?.from === parent) {
    if (guard && !(await guard())) return;
    window.history.back();
  } else {
    await navigate(parentPath, { replace: true });
  }
}

/** The current route, re-rendering on every change. */
export function useRoute() {
  attach();
  const [hash, setHash] = useState(current());
  useEffect(() => {
    listeners.add(setHash);
    setHash(current());
    return () => listeners.delete(setHash);
  }, []);
  return parse(hash);
}

/**
 * The host's options menu used to open "My Apps" as `?opt=apps`, and an
 * installed host may still ask for it that way.
 */
export function redirectLegacyQuery() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("opt") === "apps") {
    window.history.replaceState(null, "", window.location.pathname + href(["apps"]));
  }
}

/* ----------------------------------------------------------------- intent */

/**
 * "New app" on Home should arrive at Code with the dialog already open. That is
 * a one-shot instruction to the next screen, not a place, so it is not a route:
 * a reload must not reopen the dialog.
 */
let intent = null;

export function setIntent(value) {
  intent = value;
}

export function takeIntent(value) {
  if (intent !== value) return false;
  intent = null;
  return true;
}
