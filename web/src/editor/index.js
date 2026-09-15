/**
 * The code editor, on CodeMirror 6.
 *
 * CodeMirror 4.6.0 (2014) was 2.6 MB and ~500 of the bundle's 690 files. Phase
 * 4a cut it to 592 KB by deleting the 78 modes, 51 addons and 228 KB of keymaps
 * nothing referenced; this replaces what was left (§3.7).
 *
 * CM6 is the right editor on the merits for this product, not just the newer
 * one: it is the only one of CodeMirror/Monaco/Ace with practical touch
 * support, and aCelery's primary form factor is a phone. It is also
 * tree-shakeable, which is the whole reason the build step from §4 exists —
 * only the six languages the IDE actually opens are bundled.
 *
 * The API here is deliberately small. The IDE used five things from CM4
 * (construct, setOption("theme"), on("change"), getValue, setSize) and gets the
 * same five back, so migrating the editor and rewriting the IDE stay separate
 * pieces of work.
 */

import { EditorView, keymap, lineNumbers, highlightActiveLine,
         highlightActiveLineGutter, drawSelection, rectangularSelection,
         highlightSpecialChars, dropCursor, crosshairCursor } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { closeBrackets, closeBracketsKeymap, autocompletion,
         completionKeymap } from "@codemirror/autocomplete";
import { bracketMatching, foldGutter, foldKeymap, indentOnInput,
         syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { oneDark } from "@codemirror/theme-one-dark";

import { PALETTE_THEMES, DARK_THEMES } from "./themes.js";

import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html as htmlLang } from "@codemirror/lang-html";
import { xml } from "@codemirror/lang-xml";

/**
 * The languages an aCelery app is actually written in, by file extension.
 *
 * CM4 shipped six modes after Phase 4a's pruning, but two of them were for
 * languages the product cannot produce: the IDE's New File dialog offers .js
 * and .css only, and `clike` and `php` were in the tree because CM4's mode
 * directory shipped all 84 of them. Their Lezer grammars are 133 KB of the
 * bundle, so they are not carried: a .php file now opens with HTML
 * highlighting rather than PHP. Restoring either is one import and one entry.
 *
 * `html` pulls JavaScript and CSS itself, the way `htmlmixed` did.
 */
const LANGUAGES = {
  js: javascript,
  mjs: javascript,
  json: () => javascript({ json: true }),
  css: css,
  html: htmlLang,
  htm: htmlLang,
  xml: xml,
  svg: xml,
};

/** Resolves a filename or extension to a language extension. */
export function languageFor(nameOrExt) {
  const ext = String(nameOrExt ?? "")
    .toLowerCase()
    .split(".")
    .pop();
  const factory = LANGUAGES[ext];
  return factory ? factory() : htmlLang();
}

/**
 * The editor themes on offer.
 *
 * `light` is CodeMirror's own default, which is why it is empty: with no theme
 * extension the base styles and `defaultHighlightStyle` apply. `dark` is
 * One Dark, the scheme CM6 ships. The rest are palettes in ./themes.js.
 */
export const THEMES = {
  light: [],
  dark: [oneDark],
  ...PALETTE_THEMES,
};

/**
 * The list a settings screen should offer, in the order it should offer it.
 *
 * Exported so the IDE does not keep its own copy: adding a palette here is the
 * whole of adding a theme, rather than a palette plus a forgotten `<option>`.
 * An empty value means "follow the aCelery theme".
 */
export const EDITOR_THEMES = [
  { value: "", label: "Follow app theme", dark: null },
  { value: "light", label: "Light", dark: false },
  { value: "github", label: "GitHub", dark: false },
  { value: "eclipse", label: "Eclipse", dark: false },
  { value: "solarized-light", label: "Solarized Light", dark: false },
  { value: "dark", label: "One Dark", dark: true },
  { value: "dracula", label: "Dracula", dark: true },
  { value: "monokai", label: "Monokai", dark: true },
  { value: "nord", label: "Nord", dark: true },
  { value: "gruvbox-dark", label: "Gruvbox Dark", dark: true },
  { value: "solarized-dark", label: "Solarized Dark", dark: true },
];

/** Whether a named theme is a dark one. */
export function isDarkTheme(name) {
  return name === "dark" || DARK_THEMES.has(name);
}

/**
 * Sizing is a theme extension rather than a `setSize` call, because CM6 has no
 * imperative sizing: the view fills whatever box it is given.
 */
function sizing(width, height) {
  return EditorView.theme({
    "&": {
      width: typeof width === "number" ? `${width}px` : (width ?? "100%"),
      height: typeof height === "number" ? `${height}px` : (height ?? "100%"),
    },
    ".cm-scroller": { overflow: "auto" },
    // A phone keyboard is the primary input here, so the text has to be
    // legible without pinching.
    ".cm-content": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
  });
}

/**
 * The extension set that replaces CM4's `basicSetup`.
 *
 * Listed explicitly rather than imported as `basicSetup`, so that what the
 * bundle carries is visible here and a future addition is a deliberate act.
 */
function baseExtensions() {
  return [
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    drawSelection(),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    bracketMatching(),
    closeBrackets(),
    autocompletion(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    // Wrap rather than scroll sideways. CM4 did not, which on a 400px screen
    // means dragging horizontally to read the end of every line — and the
    // phone is this product's primary form factor, which is most of why CM6
    // was the right editor to move to (§3.7).
    EditorView.lineWrapping,
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...completionKeymap,
      // Tab indents rather than moving focus. On a phone there is nowhere for
      // focus to go, and an editor that cannot indent is not an editor.
      indentWithTab,
    ]),
  ];
}

/**
 * Creates an editor in `parent`.
 *
 * @param {Element} parent
 * @param {object} options
 * @param {string} [options.value]     initial text
 * @param {string} [options.filename]  picks the language
 * @param {"light"|"dark"} [options.theme]
 * @param {number|string} [options.width]
 * @param {number|string} [options.height]
 * @param {(value: string) => void} [options.onChange]
 * @param {(value: string) => void} [options.onSave]  Mod-S; omit to leave the
 *   key to the browser
 * @param {boolean} [options.readOnly]
 */
export function createEditor(parent, options = {}) {
  const language = new Compartment();
  const theme = new Compartment();
  const size = new Compartment();
  const editable = new Compartment();

  /* Ahead of the base keymaps, so it wins over anything they bind to Mod-S,
     and preventDefault so a desktop browser does not open "Save page as". */
  const saveKey = options.onSave
    ? [keymap.of([{
        key: "Mod-s",
        preventDefault: true,
        run: (v) => {
          options.onSave(v.state.doc.toString());
          return true;
        },
      }])]
    : [];

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: options.value ?? "",
      extensions: [
        ...saveKey,
        ...baseExtensions(),
        language.of(languageFor(options.filename)),
        theme.of(THEMES[options.theme] ?? THEMES.light),
        size.of(sizing(options.width, options.height)),
        editable.of(EditorView.editable.of(!options.readOnly)),
        EditorView.updateListener.of((update) => {
          // docChanged, not any update: a cursor move is not an edit, and the
          // IDE enables its Save item off this.
          if (update.docChanged) options.onChange?.(update.state.doc.toString());
        }),
      ],
    }),
  });

  return {
    view,

    getValue: () => view.state.doc.toString(),

    setValue(text) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text ?? "" },
      });
    },

    /** Swaps the language without losing the document or the undo history. */
    setLanguage(filename) {
      view.dispatch({
        effects: language.reconfigure(languageFor(filename)),
      });
    },

    setTheme(name) {
      view.dispatch({
        effects: theme.reconfigure(THEMES[name] ?? THEMES.light),
      });
    },

    setSize(width, height) {
      view.dispatch({ effects: size.reconfigure(sizing(width, height)) });
    },

    setReadOnly(readOnly) {
      view.dispatch({
        effects: editable.reconfigure(EditorView.editable.of(!readOnly)),
      });
    },

    focus: () => view.focus(),

    destroy: () => view.destroy(),
  };
}
