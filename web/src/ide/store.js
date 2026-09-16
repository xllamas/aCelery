/**
 * Everything the shell reads from the device: settings, projects, databases.
 *
 * My Apps and the IDE each carried their own copy of the manifest-reading loop.
 * Both destinations list the same folders, so there is one here.
 */

import * as file from "acelery/file.js";
import { openDB } from "acelery/sql.js";

import { loadScaffold } from "./scaffold.js";

/* ----------------------------------------------------------------- config */

/**
 * Settings live in `acelery.db`, as they always have.
 *
 * Keys in use: `theme`, `theme.mode`, `editortheme`, and the three `recent.*`
 * keys Home's Continue card reads.
 */
export async function loadConfig() {
  const db = await openDB("acelery.db");
  try {
    await db.exec(
      "create table if not exists config (cfg_key text unique, cfg_value text)",
    );
    const rows = await db.select("select cfg_key, cfg_value from config");
    return Object.fromEntries(rows.map((r) => [r.cfg_key, r.cfg_value]));
  } finally {
    await db.close();
  }
}

/** One parameterised upsert per key, so an apostrophe cannot break it. */
export async function saveConfig(settings) {
  const db = await openDB("acelery.db");
  try {
    await db.exec(
      "create table if not exists config (cfg_key text unique, cfg_value text)",
    );
    for (const [key, value] of Object.entries(settings)) {
      await db.exec(
        "insert into config (cfg_key, cfg_value) values (?, ?)" +
          " on conflict(cfg_key) do update set cfg_value = excluded.cfg_value",
        [key, value ?? ""],
      );
    }
  } finally {
    await db.close();
  }
}

/* ------------------------------------------------------------------ paths */

let root = null;

/** The storage root the host accepts as a base path, asked for once. */
export function storageRoot() {
  root ??= file.externalStoragePath().catch((e) => {
    root = null; // let the next caller try again
    throw e;
  });
  return root;
}

/** `…/aCelery/www/user/`, where projects live. */
export async function userBase() {
  return (await storageRoot()) + "/aCelery/www/user/";
}

/** `…/aCelery/`, whose `db/` folder holds the databases. */
export async function dataBase() {
  return (await storageRoot()) + "/aCelery/";
}

/* --------------------------------------------------------------- projects */

/**
 * A manifest `icon` is a path inside the project. Anything that could climb out
 * of it, or name another origin, is ignored and the monogram is drawn instead.
 */
function safeIcon(project, icon) {
  if (typeof icon !== "string" || !/^[\w.-]+(\/[\w.-]+)*$/.test(icon)) return null;
  if (icon.split("/").includes("..")) return null;
  return `/user/${encodeURIComponent(project)}/${icon}`;
}

export async function readManifest(name, base) {
  base ??= await userBase();
  try {
    const handle = await file.open("acelery_app.json", base + name);
    const text = await handle.read();
    await handle.close();
    const json = text ? JSON.parse(text) : {};
    return {
      description: typeof json.description === "string" ? json.description : "",
      entry: typeof json.entry === "string" && json.entry ? json.entry : "main.js",
      icon: safeIcon(name, json.icon),
    };
  } catch {
    // A project without a readable manifest is still a project.
    return { description: "", entry: "main.js", icon: null };
  }
}

/** Every project folder, with what its manifest says about it. */
export async function listProjects() {
  const base = await userBase();
  const entries = await file.listFiles("user", base.replace(/user\/$/, ""));
  const projects = [];
  for (const entry of entries) {
    if (!entry.directory) continue;
    projects.push({ name: entry.fname, ...(await readManifest(entry.fname, base)) });
  }
  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

export async function projectExists(name) {
  const base = await userBase();
  const entries = await file.listFiles("user", base.replace(/user\/$/, ""));
  return entries.some((e) => e.directory && e.fname === name);
}

/** The files directly inside a project, folders excluded. */
export async function listProjectFiles(project) {
  const entries = await file.listFiles(project, await userBase());
  return entries
    .filter((e) => !e.directory)
    .map((e) => ({ name: e.fname, length: e.length, modified: e.lastmodified }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function readProjectFile(project, name) {
  const handle = await file.open(name, (await userBase()) + project);
  try {
    return await handle.read();
  } finally {
    await handle.close();
  }
}

export async function writeProjectFile(project, name, text) {
  const handle = await file.open(name, (await userBase()) + project);
  try {
    await handle.write(text);
  } finally {
    await handle.close();
  }
}

export async function deleteProjectFile(project, name) {
  const handle = await file.open(name, (await userBase()) + project);
  await handle.delete();
}

export async function deleteProject(name) {
  const handle = await file.open(name, await userBase());
  await handle.delete();
}

/**
 * Creates a project folder and its starting files — a manifest and a runnable
 * entry module — from the scaffold the MCP server shares (scaffold.js). The
 * name is capitalised, as createProject() always did.
 *
 * @returns {Promise<string>} the name actually used
 */
export async function createProject({ name, description }) {
  const scaffold = await loadScaffold();
  const pName = scaffold.projectName(name);
  const base = await userBase();
  await file.mkdir(pName, base);
  for (const [fname, text] of Object.entries(scaffold.files(pName, description))) {
    await writeProjectFile(pName, fname, text);
  }
  return pName;
}

/* -------------------------------------------------------------- databases */

/** Every database file, SQLite's journals excluded. */
export async function listDatabases() {
  const entries = await file.listFiles("db", await dataBase());
  return entries
    .filter((e) => !e.directory && !e.fname.includes("journal"))
    .map((e) => ({ name: e.fname, length: e.length, modified: e.lastmodified }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Checked before opening, because opening a database that does not exist
 * creates it — a stale Continue card would otherwise leave an empty file.
 */
export async function databaseExists(name) {
  return (await listDatabases()).some((d) => d.name === name);
}

/** SQLite cannot bind an identifier, so identifiers are validated instead. */
export function identifier(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`"${name}" is not a usable table name`);
  }
  return name;
}

/* ------------------------------------------------------------------- host */

/** True inside the aCelery app; false in a browser on the network. */
export function hasHost() {
  return !!globalThis.ACeleryHost;
}

/**
 * The shell's own messages to the host (§7): the network sheet, the wakelock,
 * the status bar colour. Fire-and-forget, like every host message, and a no-op
 * without a host — the rows that send them are hidden there anyway.
 */
export function hostPost(payload) {
  globalThis.ACeleryHost?.postMessage(JSON.stringify(payload));
}

/* ----------------------------------------------------------------- format */

export function formatSize(bytes) {
  if (typeof bytes !== "number" || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(millis) {
  if (typeof millis !== "number" || !millis) return "";
  const d = new Date(millis);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}
