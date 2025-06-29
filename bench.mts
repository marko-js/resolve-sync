import "./build.mts";

import fs from "node:fs";

import enhancedResolve from "enhanced-resolve";
import { bench, run } from "mitata";
import resolve from "resolve";

import { resolveSync as resolveSyncMarko } from "./dist/index.mjs";

const testFromDir = process.cwd();
const testFrom = `${testFromDir}/test.js`;

bench("resolve-sync (marko)", () => {
  resolveSyncMarko(getModuleName(), { from: testFrom });
});

bench("resolve (browserify ish)", () => {
  resolve.sync(getModuleName(), { basedir: testFromDir });
});

const enhancedResolver = enhancedResolve.create.sync({
  extensions: [".js", ".json"],
  conditionNames: ["default", "node", "import", "require"],
});
bench("enhanced-resolve (webpack)", () => {
  enhancedResolver(testFromDir, getModuleName());
});

try {
  await run();
} finally {
  fs.rmSync(`${testFromDir}/node_modules/@_`, { recursive: true, force: true });
}

function getModuleName() {
  const name = `@_/${Math.trunc(Math.random() * Number.MAX_SAFE_INTEGER).toString(36)}`;
  const moduleDir = `${testFromDir}/node_modules/${name}`;
  fs.mkdirSync(moduleDir, { recursive: true });
  fs.writeFileSync(`${moduleDir}/index.js`, "");
  fs.writeFileSync(`${moduleDir}/package.json`, "{}");
  return name;
}
