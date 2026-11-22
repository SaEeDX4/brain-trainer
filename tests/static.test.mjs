import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const html = read("index.html");
const css = read("assets/css/styles.css");
const js = read("assets/js/script.js");

test("required assets are linked and present", () => {
  for (const path of ["assets/css/styles.css", "assets/js/script.js"]) {
    assert.ok(existsSync(join(root, path)), path);
    assert.ok(html.includes('"' + path + '"'), path);
  }
});
test("HTML IDs are unique", () => {
  const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size);
});
test("DOM lookups resolve to static or dynamic elements", () => {
  const ids = new Set([...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]));
  ids.add("sound-toggle");
  for (const [, id] of js.matchAll(/getElementById\(\s*["']([^"']+)["']\s*\)/g)) {
    assert.ok(ids.has(id), id);
  }
});
test("script parses", () => {
  assert.doesNotThrow(() => new Script(js, { filename: "script.js" }));
});
test("challenge guide is scoped to menu", () => {
  assert.match(html, /id="challenge-explanation" class="challenge-explanation screen"/);
  assert.match(js, /screen\.id === "challenge-screen"/);
});
test("accessibility hooks exist", () => {
  assert.equal((html.match(/aria-live="polite"/g) || []).length, 2);
  assert.equal((html.match(/aria-label="Answer to the /g) || []).length, 2);
  assert.match(css, /prefers-reduced-motion/);
});
test("game screens exist", () => {
  for (const id of ["welcome-screen", "game-screen", "results-screen", "challenge-screen", "challenge-game-screen", "challenge-results-screen"]) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  assert.match(css, /\.screen\.active\s*\{/);
});
