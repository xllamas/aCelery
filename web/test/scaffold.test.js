/**
 * The project scaffold, shared by the Code destination and the MCP server
 * (doc/mcp-server.md §2). It is imported from source, not from the bundle,
 * because Node loads it exactly that way.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  ENTRY, DESCRIPTION_MAX, descriptionProblem, entryModule, manifestText,
  nameProblem, projectName,
} from "../src/ide/scaffold.js";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("the scaffold imports nothing, so Node can load it as it is", () => {
  assert.doesNotMatch(source("../src/ide/scaffold.js"), /^\s*import\s/m);
});

test("the shell's store creates projects from it", () => {
  assert.match(source("../src/ide/store.js"), /from "\.\/scaffold\.js"/);
});

test("a name is trimmed and capitalised", () => {
  assert.equal(projectName("  todo_list "), "Todo_list");
});

test("name rules match what the New project sheet always enforced", () => {
  assert.equal(nameProblem(""), "A name is required");
  assert.equal(nameProblem("   "), "A name is required");
  assert.match(nameProblem("my app"), /Letters, numbers and underscore/);
  assert.match(nameProblem("../escape"), /Letters, numbers and underscore/);
  assert.match(nameProblem("a".repeat(17)), /16 at most/);
  assert.equal(nameProblem("a".repeat(16)), null);
  assert.equal(nameProblem(" Water_2 "), null);
});

test("a description may be absent, and is capped", () => {
  assert.equal(descriptionProblem(undefined), null);
  assert.equal(descriptionProblem("x".repeat(DESCRIPTION_MAX)), null);
  assert.equal(descriptionProblem("x".repeat(DESCRIPTION_MAX + 1)),
    "140 characters at most");
});

test("the manifest names the entry module", () => {
  assert.deepEqual(JSON.parse(manifestText("Water", "Logs intake")), {
    name: "Water", description: "Logs intake", entry: ENTRY,
  });
  assert.equal(ENTRY, "main.js");
});

test("the entry module exports main and renders the project's name", () => {
  const js = entryModule("Water");
  assert.match(js, /^import \{ html, render, Panel \} from "acelery\/ui\.js";/);
  assert.match(js, /export default function main\(\)/);
  assert.match(js, /<\$\{Panel\} title="Water">/);
});
