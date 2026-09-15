/**
 * What a new project is made of: its name rule, its manifest and its entry
 * module.
 *
 * Deliberately free of imports, so everything that creates a project can share
 * it — the Code destination, and the MCP server (doc/mcp-server.md §2), which
 * loads this file straight from Node. An app a model creates is then the same
 * app the IDE would have made.
 */

/** The module a new project's manifest names as its entry. */
export const ENTRY = "main.js";

/** A project name becomes a directory and a URL segment. */
export const NAME_PATTERN = /^\w{1,16}$/;

export const DESCRIPTION_MAX = 140;

/**
 * Why a project name cannot be used, or null. Whether the name is taken is
 * the caller's to check, against whatever it has listed.
 */
export function nameProblem(name) {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "A name is required";
  if (!NAME_PATTERN.test(trimmed)) {
    return "Letters, numbers and underscore only, 16 at most";
  }
  return null;
}

/** Why a description cannot be used, or null. */
export function descriptionProblem(description) {
  return (description ?? "").length <= DESCRIPTION_MAX
    ? null
    : `${DESCRIPTION_MAX} characters at most`;
}

/** The name actually used: trimmed and capitalised, as it always was. */
export function projectName(name) {
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** `acelery_app.json` for a new project, as the text written to disk. */
export function manifestText(name, description) {
  return JSON.stringify({ name, description, entry: ENTRY });
}

/** The entry module of a brand-new project, which already runs. */
export function entryModule(name) {
  return `import { html, render, Panel } from "acelery/ui.js";

export default function main() {
  render(html\`
    <\${Panel} title="${name}">
      <p>Your app starts here.</p>
    <//>\`, document.body);
}
`;
}
