<h1 align="center">
  <br/>
  resolve-sync
	<br/>

  <!-- Format -->
  <a href="https://github.com/prettier/prettier">
    <img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg" alt="Styled with prettier"/>
  </a>
  <!-- CI -->
  <a href="https://github.com/marko-js/resolve-sync/actions/workflows/ci.yml">
    <img src="https://github.com/marko-js/resolve-sync/actions/workflows/ci.yml/badge.svg" alt="Build status"/>
  </a>
  <!-- Coverage -->
  <a href="https://codecov.io/gh/marko-js/resolve-sync">
    <img src="https://codecov.io/gh/marko-js/resolve-sync/branch/main/graph/badge.svg?token=06lKJj8my3" alt="Code coverage"/>
  </a>
  <!-- NPM Version -->
  <a href="https://npmjs.org/package/resolve-sync">
    <img src="https://img.shields.io/npm/v/resolve-sync.svg" alt="NPM version"/>
  </a>
  <!-- Downloads -->
  <a href="https://npmjs.org/package/resolve-sync">
    <img src="https://img.shields.io/npm/dm/resolve-sync.svg" alt="Downloads"/>
  </a>
</h1>

<p align="center">
  Node module resolution that is flexible, synchronous and requires no builtin dependencies.<br/>
</p>

## Installation

```console
npm install resolve-sync
```

## Usage

```js
import { resolveSync } from "resolve-sync";

const result = resolveSync(id, options);
```

- `id`: The module id or path to resolve (e.g. `"./file"`, `"some-pkg"`, `"#alias"`).
- `options`: An object controlling resolution (see below).

## Features

This module is designed to optimize speed while resolving in the same way node and bundlers do.
It avoids using any `node:` built in modules to make using in any environment (including browsers) easy.

#### Supports

- [main field](https://nodejs.org/api/packages.html#main) (and other fields via `options.fields`)
- [browser field](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#browser)
- [custom extensions](#exts-string)
- [export conditions](https://nodejs.org/api/packages.html#exports)
- [import conditions](https://nodejs.org/api/packages.html#imports)

## Resolve Options

### `from: string` (required)

The absolute path to the source _file_ (not a directory) where the resolution is initiated. Determines the starting directory and influences relative resolution.

### `root?: string`

An optional root boundary directory. Module resolution won't ascend beyond this directory when traversing parent paths. Defaults to `/` if unspecified.

### `external?: (id: string) => boolean`

A function that, if provided, is called with each module id. If it returns `true`, the resolver will treat the id as external and return it as-is (without attempting to resolve it). This is useful for excluding certain modules from resolution (e.g., built-ins, peer dependencies, or virtual modules).

When not specified, the default behavior depends on the environment:
In node environments this value is set to `node:module`'s `isBuiltin` function, which treats all built-in modules as external. In other environments, it defaults to `() => false`, meaning no modules are treated as external unless specified.

### `external?: (id: string) => boolean`

Optional function to mark module ids as external. When `true` is returned, that id is returned without resolution (useful for built-ins, peer dependencies, or virtual modules).

Defaults:

- In Node.js: uses `node:module`'s `isBuiltin` (treats built-ins as external).
- Elsewhere: `() => false` (no externals).

```js
const result = resolveSync("fs", {
  from: "/project/src/index.js",
  external: (id) => id === "fs", // treat 'fs' as external
});
// result === "fs"
```

### `exts?: string[]`

An optional array of file extensions to try when resolving files without explicit extensions. Defaults to:

```js
[".js", ".json"];
```

### `fields?: string[]`

Specifies the priority order of package.json fields to look at when resolving package main entries. Defaults to:

- `["module", "main"]` if `browser` is `false` or unset.
- `["browser", "module", "main"]` if `browser` is `true`.

### `require?: boolean`

When `true`, this flag enables `require` conditions in `exports` maps. Default is `false`.

### `browser?: boolean`

Partially implements the [package.json browser field specification](https://github.com/defunctzombie/package-browser-field-spec).

- Prioritizes the `browser` field in package.json when selecting entry points.
- Enables `browser` remapping for internal paths (e.g., `browser: { "./main.js": "./shim.js" }`).

> **Note:**
> Remaps defined in the `browser` field are only applied when resolving the module as a dependency (e.g., `some-module/foo`).
> They do **not** affect relative paths like `./foo` that are resolved from within the module itself.
> Module remaps in the browser field likewise are not supported.

### `conditions?: string[]`

A list of custom export conditions to use during resolution of package `exports` and `imports` fields. These conditions are matched in order and function identically to how conditions are interpreted by the wonderful [`resolve.exports` module](https://github.com/lukeed/resolve.exports).

### `fs?: { isFile(file: string): boolean; readPkg(file: string): unknown; realpath?(file: string): string; }`

A partial filesystem interface used by the resolver. If running in node, and not provided, a default `node:fs` based implementation is used. Must implement:

- `isFile(file: string): boolean` – checks if the file exists and is a file.
- `readPkg(file: string): unknown` – reads and parses a JSON file (e.g., `package.json`).
- `realpath?(file: string): string` – optionally resolves symlinks or returns the canonical path.

### `preserveSymlinks?: boolean`

For use with the `--preserve-symlinks` flag in Node.js, this option is `false` by default. If set to `true`, the resolver will return the symlinked path instead of resolving it to its real path.

## Examples

### Basic usage (in Node.js)

```js
import { resolveSync } from "resolve-sync";

const result = resolveSync("./file", {
  from: "/project/src/index.js",
});
console.log(result); // => "/project/src/file.js"
```

### Resolving with custom extensions

```js
const result = resolveSync("./file", {
  from: "/project/src/index.js",
  exts: [".ts", ".js"],
});
// Tries ./file.ts, then ./file.js
```

### Resolving a package main entry

```js
const result = resolveSync("some-pkg", {
  from: "/project/src/index.js",
});
// Looks for /project/node_modules/some-pkg/package.json and resolves its main/module field
```

### Resolving files for browser/client usage

```js
const result = resolveSync("some-pkg", {
  from: "/project/src/index.js",
  browser: true,
});
// Adds the `browser` export condition.
// If no `exports` field is found will check the "browser" field in package.json
```

### Resolving files for require/commonjs usage

```js
const result = resolveSync("some-pkg", {
  from: "/project/src/index.js",
  require: true,
});
// Replaces the "node" export condition with "require".
```

### Resolving with custom fields

```js
const result = resolveSync("some-pkg", {
  from: "/project/src/index.js",
  fields: ["module", "jsnext:main", "main"],
});
// Looks for "module", then "jsnext:main" and finally "main" in package.json
```

### Resolving custom export/import conditions

```js
const result = resolveSync("some-pkg", {
  from: "/project/src/index.js",
  conditions: ["worker"],
});
// Adds "worker" to conditions, in this case ["default", "worker", "import", "node"]

const importResult = resolveSync("#alias", {
  from: "/project/src/index.js",
});
// Uses the "imports" field in the nearest package.json to find "#alias"
```

### Scope resolution under a `root` directory

```js
const result = resolveSync("some-pkg", {
  from: "/project/src/index.js",
  root: "/project", // Do not search above /project
});
// Will not resolve modules outside of /project
```

### Usage in other environments (e.g., browser, test, or virtual fs)

This module has no dependencies hard dependencies on `node:` apis and can easily be used
in browser environments (eg a repl). When doing so the `fs` option is required.

```js
import { resolveSync } from "resolve-sync";

const files = {
  "/project/src/file.js": "",
  "/project/package.json": JSON.stringify({ main: "src/file.js" }),
};

const result = resolveSync("./file", {
  from: "/project/src/index.js",
  // Provide a minimal fs interface:
  fs: {
    isFile(file) {
      return file in files;
    },
    readPkg(file) {
      return JSON.parse(files[file]);
    },
  },
});

console.log(result); // => "/project/src/file.js"
```
