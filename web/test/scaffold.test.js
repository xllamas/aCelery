/**
 * The project scaffold, shared by the Code destination and the MCP server
 * (doc/mcp-server.md §7, P5). Its rules and templates are files in the bundle;
 * this reads them from there, as the shell fetches them and the Dart side reads
 * them from the installed tree. test/mcp_scaffold_test.dart runs the same files
 * through both languages and compares the apps they make.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { scaffoldFrom } from "../src/ide/scaffold.js";

const bundled = (file) =>
  readFileSync(new URL(`../../bundle/www/system/scaffold/${file}`, import.meta.url), "utf8");

const rules = JSON.parse(bundled("scaffold.json"));
const templates = Object.fromEntries(
  Object.entries(rules.templates).map(([file, source]) => [file, bundled(source)]),
);
const scaffold = scaffoldFrom(rules, templates);

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("the shell creates projects from the fetched scaffold", () => {
  assert.match(source("../src/ide/store.js"), /loadScaffold\(\)/);
  assert.match(source("../src/ide/code_screen.js"), /loadScaffold\(\)/);
});

test("a name is trimmed and capitalised", () => {
  assert.equal(scaffold.projectName("  todo_list "), "Todo_list");
});

test("name rules match what the New project sheet always enforced", () => {
  const { nameProblem } = scaffold;
  assert.equal(nameProblem(""), "A name is required");
  assert.equal(nameProblem("   "), "A name is required");
  assert.match(nameProblem("my app"), /Letters, numbers and underscore/);
  assert.match(nameProblem("../escape"), /Letters, numbers and underscore/);
  assert.match(nameProblem("a".repeat(17)), /16 at most/);
  assert.equal(nameProblem("a".repeat(16)), null);
  assert.equal(nameProblem(" Water_2 "), null);
});

test("a description may be absent, and is capped", () => {
  const { descriptionProblem } = scaffold;
  assert.equal(descriptionProblem(undefined), null);
  assert.equal(descriptionProblem("x".repeat(rules.descriptionMax)), null);
  assert.equal(descriptionProblem("x".repeat(rules.descriptionMax + 1)),
    "140 characters at most");
});

test("the manifest names the entry module", () => {
  const files = scaffold.files("Water", "Logs intake");
  assert.deepEqual(JSON.parse(files["acelery_app.json"]), {
    name: "Water", description: "Logs intake", entry: "main.js",
  });
  assert.equal(scaffold.entry, "main.js");
  assert.ok(files["main.js"], "the entry module is one of the files");
});

test("the entry module exports main and renders the project's name", () => {
  const js = scaffold.files("Water")["main.js"];
  assert.match(js, /^import \{ html, render, Panel \} from "acelery\/ui\.js";/);
  assert.match(js, /export default function main\(\)/);
  assert.match(js, /<\$\{Panel\} title="Water">/);
  assert.doesNotMatch(js, /\{\{name\}\}/);
});
