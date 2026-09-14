/**
 * Editor colour schemes.
 *
 * CodeMirror 4 shipped 30 theme *stylesheets*. CodeMirror 6 expresses a theme
 * as an extension instead, so none of them carried over — a different
 * mechanism, not a convertible format — and Phase 4d shipped Light, Dark and
 * "follow the app theme" while the question of whether more were wanted was
 * recorded as §9.7. This is the answer to that.
 *
 * A theme here is a palette, not forty lines of boilerplate: `build()` turns
 * sixteen colours into the `EditorView.theme` and `HighlightStyle` pair CM6
 * wants. Adding one is adding a palette.
 *
 * These are the well-known schemes by their published palettes rather than
 * ports of CM4's stylesheets — the same honesty the Bootswatch theme deltas
 * get. Solarized, Monokai and Eclipse existed in the CM4 list under those
 * names; the rest replace its more obscure entries with schemes people can
 * actually name.
 */

import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

/**
 * Builds a CM6 theme from a palette.
 *
 * @param {object} p
 * @param {boolean} p.dark        tells CM6 which cursor and selection blending to use
 * @param {string} p.bg           editor background
 * @param {string} p.fg           default text
 * @param {string} p.caret
 * @param {string} p.selection
 * @param {string} p.gutterBg
 * @param {string} p.gutterFg
 * @param {string} p.activeLine
 * @param {string} p.comment
 * @param {string} p.keyword
 * @param {string} p.string
 * @param {string} p.number
 * @param {string} p.name         variables
 * @param {string} p.type         types, classes, tag names
 * @param {string} p.operator
 * @param {string} p.fn           function names
 */
function build(p) {
  const view = EditorView.theme(
    {
      "&": { color: p.fg, backgroundColor: p.bg },
      ".cm-content": { caretColor: p.caret },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: p.caret },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
        { backgroundColor: p.selection },
      ".cm-activeLine": { backgroundColor: p.activeLine },
      ".cm-gutters": {
        backgroundColor: p.gutterBg,
        color: p.gutterFg,
        border: "none",
      },
      ".cm-activeLineGutter": { backgroundColor: p.activeLine, color: p.fg },
      ".cm-foldPlaceholder": {
        backgroundColor: "transparent",
        border: "none",
        color: p.comment,
      },
      /* Search matches have to stay legible against every one of these
         backgrounds, so they take an accent rather than a fixed yellow. */
      ".cm-selectionMatch": { backgroundColor: p.selection },
      ".cm-searchMatch": {
        backgroundColor: p.selection,
        outline: `1px solid ${p.caret}`,
      },
      ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: p.caret },
      ".cm-panels": { backgroundColor: p.gutterBg, color: p.fg },
      ".cm-tooltip": {
        backgroundColor: p.gutterBg,
        color: p.fg,
        border: `1px solid ${p.selection}`,
      },
      ".cm-tooltip-autocomplete ul li[aria-selected]": {
        backgroundColor: p.selection,
        color: p.fg,
      },
    },
    { dark: p.dark },
  );

  const highlight = HighlightStyle.define([
    { tag: [t.comment, t.lineComment, t.blockComment, t.docComment],
      color: p.comment, fontStyle: "italic" },
    { tag: [t.keyword, t.modifier, t.controlKeyword, t.moduleKeyword],
      color: p.keyword },
    { tag: [t.string, t.special(t.string), t.regexp], color: p.string },
    { tag: [t.number, t.bool, t.null, t.atom], color: p.number },
    { tag: [t.variableName, t.propertyName, t.attributeName], color: p.name },
    { tag: [t.typeName, t.className, t.tagName, t.namespace], color: p.type },
    { tag: [t.operator, t.punctuation, t.separator, t.bracket],
      color: p.operator },
    { tag: [t.function(t.variableName), t.function(t.propertyName),
            t.definition(t.variableName), t.definition(t.function(t.variableName))],
      color: p.fn },
    { tag: [t.heading, t.strong], color: p.keyword, fontWeight: "bold" },
    { tag: [t.link, t.url], color: p.fn, textDecoration: "underline" },
    { tag: t.invalid, color: "#f00" },
  ]);

  return [view, syntaxHighlighting(highlight)];
}

/* --------------------------------------------------------------- palettes */

/** Solarized, Ethan Schoonover's published values. */
const SOLARIZED = {
  base03: "#002b36", base02: "#073642", base01: "#586e75", base00: "#657b83",
  base0: "#839496", base1: "#93a1a1", base2: "#eee8d5", base3: "#fdf6e3",
  yellow: "#b58900", orange: "#cb4b16", red: "#dc322f", magenta: "#d33682",
  violet: "#6c71c4", blue: "#268bd2", cyan: "#2aa198", green: "#859900",
};

const PALETTES = {
  "solarized-light": {
    dark: false,
    bg: SOLARIZED.base3, fg: SOLARIZED.base00, caret: SOLARIZED.orange,
    selection: "#e6dfc5", gutterBg: SOLARIZED.base2, gutterFg: SOLARIZED.base1,
    activeLine: "#eee8d5",
    comment: SOLARIZED.base1, keyword: SOLARIZED.green, string: SOLARIZED.cyan,
    number: SOLARIZED.magenta, name: SOLARIZED.blue, type: SOLARIZED.yellow,
    operator: SOLARIZED.green, fn: SOLARIZED.blue,
  },
  "solarized-dark": {
    dark: true,
    bg: SOLARIZED.base03, fg: SOLARIZED.base0, caret: SOLARIZED.orange,
    selection: "#0b3c49", gutterBg: SOLARIZED.base02, gutterFg: SOLARIZED.base01,
    activeLine: "#073642",
    comment: SOLARIZED.base01, keyword: SOLARIZED.green, string: SOLARIZED.cyan,
    number: SOLARIZED.magenta, name: SOLARIZED.blue, type: SOLARIZED.yellow,
    operator: SOLARIZED.green, fn: SOLARIZED.blue,
  },
  monokai: {
    dark: true,
    bg: "#272822", fg: "#f8f8f2", caret: "#f8f8f0", selection: "#49483e",
    gutterBg: "#272822", gutterFg: "#90908a", activeLine: "#3e3d32",
    comment: "#75715e", keyword: "#f92672", string: "#e6db74",
    number: "#ae81ff", name: "#f8f8f2", type: "#66d9ef",
    operator: "#f92672", fn: "#a6e22e",
  },
  dracula: {
    dark: true,
    bg: "#282a36", fg: "#f8f8f2", caret: "#f8f8f2", selection: "#44475a",
    gutterBg: "#282a36", gutterFg: "#6272a4", activeLine: "#343746",
    comment: "#6272a4", keyword: "#ff79c6", string: "#f1fa8c",
    number: "#bd93f9", name: "#f8f8f2", type: "#8be9fd",
    operator: "#ff79c6", fn: "#50fa7b",
  },
  nord: {
    dark: true,
    bg: "#2e3440", fg: "#d8dee9", caret: "#d8dee9", selection: "#434c5e",
    gutterBg: "#2e3440", gutterFg: "#4c566a", activeLine: "#3b4252",
    comment: "#616e88", keyword: "#81a1c1", string: "#a3be8c",
    number: "#b48ead", name: "#d8dee9", type: "#8fbcbb",
    operator: "#81a1c1", fn: "#88c0d0",
  },
  "gruvbox-dark": {
    dark: true,
    bg: "#282828", fg: "#ebdbb2", caret: "#ebdbb2", selection: "#504945",
    gutterBg: "#282828", gutterFg: "#7c6f64", activeLine: "#3c3836",
    comment: "#928374", keyword: "#fb4934", string: "#b8bb26",
    number: "#d3869b", name: "#ebdbb2", type: "#fabd2f",
    operator: "#fe8019", fn: "#8ec07c",
  },
  eclipse: {
    dark: false,
    bg: "#ffffff", fg: "#000000", caret: "#000000", selection: "#d7d4f0",
    gutterBg: "#f7f7f7", gutterFg: "#999988", activeLine: "#f0f0f8",
    comment: "#3f7f5f", keyword: "#7f0055", string: "#2a00ff",
    number: "#116644", name: "#000000", type: "#7f0055",
    operator: "#000000", fn: "#000000",
  },
  github: {
    dark: false,
    bg: "#ffffff", fg: "#24292f", caret: "#24292f", selection: "#b6d7ff",
    gutterBg: "#ffffff", gutterFg: "#8c959f", activeLine: "#f6f8fa",
    comment: "#6e7781", keyword: "#cf222e", string: "#0a3069",
    number: "#0550ae", name: "#24292f", type: "#953800",
    operator: "#cf222e", fn: "#8250df",
  },
};

/** Ready-built extensions, one per palette. */
export const PALETTE_THEMES = Object.fromEntries(
  Object.entries(PALETTES).map(([name, palette]) => [name, build(palette)]),
);

/** Which palettes are dark, so "follow the app theme" can pick sensibly. */
export const DARK_THEMES = new Set(
  Object.entries(PALETTES)
    .filter(([, p]) => p.dark)
    .map(([name]) => name),
);
