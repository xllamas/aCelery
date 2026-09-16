/**
 * What a new project is made of: its name rule, its manifest and its starting
 * files.
 *
 * The rules and templates are not written here. They are files in the bundle,
 * under /system/scaffold/, because two languages create projects: this shell,
 * and the MCP server inside the app, which is Dart and reads the same files
 * from the installed tree (doc/mcp-server.md §7, P5). An app a model creates is
 * then the same app the IDE would have made.
 */

/** Where the scaffold is served from, next to the shell itself. */
export const SCAFFOLD_URL = "/system/scaffold/";

const PLACEHOLDER = /\{\{name\}\}/g;

/**
 * The scaffold as functions, from `scaffold.json` and its template texts.
 *
 * @param {object} rules the parsed scaffold.json
 * @param {Object<string,string>} templates file name → template text, for
 *   every entry in `rules.templates`
 */
export function scaffoldFrom(rules, templates) {
  const pattern = new RegExp(rules.namePattern);
  const { messages } = rules;

  return {
    /** The module a new project's manifest names as its entry. */
    entry: rules.entry,

    /**
     * Why a project name cannot be used, or null. Whether the name is taken is
     * the caller's to check, against whatever it has listed.
     */
    nameProblem(name) {
      const trimmed = (name ?? "").trim();
      if (!trimmed) return messages.nameRequired;
      if (!pattern.test(trimmed)) return messages.nameInvalid;
      return null;
    },

    /** Why a description cannot be used, or null. */
    descriptionProblem(description) {
      return (description ?? "").length <= rules.descriptionMax
        ? null
        : messages.descriptionTooLong;
    },

    /** The name actually used: trimmed and capitalised, as it always was. */
    projectName(name) {
      const trimmed = name.trim();
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    },

    /**
     * Every file of a new project, as name → text, manifest first. `name` is
     * the name actually used.
     */
    files(name, description) {
      const out = {
        "acelery_app.json": JSON.stringify({
          name, description: description ?? "", entry: rules.entry,
        }),
      };
      for (const file of Object.keys(rules.templates)) {
        out[file] = templates[file].replace(PLACEHOLDER, name);
      }
      return out;
    },
  };
}

let loading = null;

/**
 * Fetches the scaffold once per page. A failure is not cached, so the next
 * caller tries again.
 */
export function loadScaffold() {
  loading ??= (async () => {
    const text = async (file) => {
      const response = await fetch(SCAFFOLD_URL + file);
      if (!response.ok) {
        throw new Error(`${SCAFFOLD_URL}${file}: ${response.status}`);
      }
      return response.text();
    };
    const rules = JSON.parse(await text("scaffold.json"));
    const templates = {};
    for (const [file, source] of Object.entries(rules.templates)) {
      templates[file] = await text(source);
    }
    return scaffoldFrom(rules, templates);
  })().catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}
