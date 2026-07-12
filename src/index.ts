import { exports, imports } from "resolve.exports";

import { external as defaultExternal, fs as defaultFS } from "#defaults";
export interface ResolveOptions {
  /**
   * The absolute path to the file from which to resolve the module.
   */
  from: string;
  /**
   * The root directory for resolution. Defaults to "/".
   */
  root?: string;
  /**
   * File extensions to consider. Defaults to [".js", ".json"].
   */
  exts?: string[];
  /**
   * Package.json fields to check for entry points. Defaults to ["module", "main"] or ["browser", "module", "main"] if browser option is true.
   */
  fields?: string[];
  /**
   * If true, suppresses errors and returns undefined when a module cannot be resolved. Defaults to false.
   */
  silent?: boolean;
  /**
   * If true, resolves using CommonJS (require) semantics.
   */
  require?: boolean;
  /**
   * If true, resolves using browser field mappings.
   */
  browser?: boolean;
  /**
   * Additional conditions for conditional exports/imports.
   */
  conditions?: string[];
  /**
   * Function to determine if a module id should be treated as external.
   */
  external?: (id: string) => boolean;
  /**
   * If true, preserves symbolic links instead of resolving to real paths.
   */
  preserveSymlinks?: boolean;
  /**
   * Custom file system interface.
   */
  fs?: {
    isFile(file: string): boolean;
    readPkg(file: string): unknown;
    realpath?(file: string): string;
  };
}

interface ResolveContext {
  root: string;
  from: string;
  fromDir: string;
  exts: string[];
  fields: string[];
  silent: boolean;
  external: (id: string) => boolean;
  isFile(file: string): boolean;
  readPkg(file: string): unknown;
  realpath(file: string): string;
  resolve: {
    browser: boolean;
    require: boolean;
    conditions: string[] | undefined;
  };
}

const defaultExts = [".js", ".json"];
const defaultFields = ["module", "main"];
const defaultBrowserFields = ["browser", "module", "main"];
const identity = (file: string) => file;

export function resolveSync(
  id: string,
  opts: ResolveOptions,
): string | false | undefined {
  const ctx = toContext(opts);
  const resolved = resolveId(ctx, id);

  if (resolved === false) {
    return false;
  }

  if (!resolved) {
    if (ctx.silent) return;
    throw new Error(`Cannot find module '${id}' from '${ctx.from}'`);
  }

  return ctx.realpath(resolved);
}

function toContext(opts: ResolveOptions): ResolveContext {
  const fs = opts.fs || defaultFS;
  const realpath = (!opts.preserveSymlinks && fs.realpath) || identity;
  const root = normalizeRoot(toPosix(opts.root || "/"));
  const from = toPosix(opts.from);
  const fromDir = dirname(from);
  const browser = !!opts.browser;
  const require = !!opts.require;
  return {
    root,
    from,
    fromDir,
    silent: !!opts.silent,
    exts: opts.exts || defaultExts,
    fields: opts.fields || (browser ? defaultBrowserFields : defaultFields),
    realpath,
    external: opts.external || defaultExternal,
    readPkg: fs.readPkg,
    isFile: fs.isFile,
    resolve: {
      browser,
      require,
      conditions: opts.conditions,
    },
  };
}

function resolveId(ctx: ResolveContext, id: string) {
  switch (id[0]) {
    case ".":
      return resolveRelative(ctx, ctx.fromDir, id);
    case "#":
      return resolveSubImport(ctx, ctx.fromDir, id);
    default:
      return ctx.external(id) ? id : resolvePkg(ctx, id);
  }
}

function resolveRelative(ctx: ResolveContext, dir: string, id: string) {
  const file = join(dir, id);
  return id === "." || id === ".." || id[id.length - 1] === "/"
    ? resolveDir(ctx, file)
    : resolveFile(ctx, file) || resolveDir(ctx, file);
}

function resolveSubImport(ctx: ResolveContext, fromDir: string, id: string) {
  const root = ctx.root;
  let dir = fromDir;
  for (;;) {
    const pkgFile = joinDir(dir) + "package.json";
    if (ctx.isFile(pkgFile)) {
      return resolveFirst(ctx, dir, matchImports(ctx, pkgFile, id));
    }
    // Stop after checking `root` itself so a package.json at the boundary is
    // honored, but nothing above it is searched.
    if (dir === root) return;
    const parent = dirname(dir);
    // A directory that is its own parent is the file system root (e.g.
    // "D:/" on Windows, which never equals the default "/" root).
    if (parent === dir) return;
    dir = parent;
  }
}

function resolveFirst(
  ctx: ResolveContext,
  dir: string,
  matches: void | string[],
) {
  if (matches) {
    for (const match of matches) {
      const file = join(dir, match);
      if (ctx.isFile(file)) {
        return file;
      }
    }
  }
}

function resolveFile(ctx: ResolveContext, file: string): string | undefined {
  if (ctx.isFile(file)) {
    return file;
  }

  for (const ext of ctx.exts) {
    const fileWithExt = file + ext;
    if (ctx.isFile(fileWithExt)) {
      return fileWithExt;
    }
  }
}

function resolveDir(ctx: ResolveContext, file: string): string | undefined {
  return resolvePkgPart(ctx, file, "") || resolveFile(ctx, file + "/index");
}

function resolvePkg(ctx: ResolveContext, id: string) {
  let dir = ctx.fromDir;
  let slash = id.indexOf("/");
  let name = id;
  let part = "";

  if (slash !== -1) {
    if (id[0] !== "@") {
      name = id.slice(0, slash);
      part = id.slice(slash);
    } else {
      slash = id.indexOf("/", slash + 1);
      if (slash !== -1) {
        name = id.slice(0, slash);
        part = id.slice(slash);
      }
    }
  }

  const root = ctx.root;
  for (;;) {
    const resolved = resolvePkgPart(
      ctx,
      joinDir(dir) + "node_modules/" + name,
      part,
    );
    if (resolved !== undefined) return resolved;
    // Stop after searching `root` itself so its node_modules is included, but
    // nothing above it is searched.
    if (dir === root) return;
    const parent = dirname(dir);
    // A directory that is its own parent is the file system root (e.g.
    // "D:/" on Windows, which never equals the default "/" root).
    if (parent === dir) return;
    dir = parent;
  }
}

function resolvePkgPart(ctx: ResolveContext, pkgDir: string, part: string) {
  const pkgFile = pkgDir + "/package.json";
  if (ctx.isFile(pkgFile)) {
    const pkg = ctx.readPkg(pkgFile);

    if (!pkg || typeof pkg !== "object") {
      if (ctx.silent) return;
      throw new Error(`Invalid package '${pkgFile}' loaded by '${ctx.from}'.`);
    }

    const resolved =
      "exports" in pkg
        ? resolveFirst(ctx, pkgDir, matchExports(ctx, pkg, part))
        : resolvePkgField(ctx, pkg, pkgDir, part);

    if (resolved === undefined) {
      if (ctx.silent) return;
      throw new Error(
        `Could not resolve entry for package '${pkgFile}' loaded by '${ctx.from}'.`,
      );
    }

    return resolved;
  }
}

function matchExports(ctx: ResolveContext, pkg: object, part: string) {
  try {
    return exports(pkg, "." + part, ctx.resolve);
  } catch (err) {
    // resolve.exports throws when the exports map cannot satisfy the
    // requested subpath or conditions.
    if (!ctx.silent) throw err;
  }
}

function matchImports(ctx: ResolveContext, pkgFile: string, id: string) {
  try {
    return imports(ctx.readPkg(pkgFile) as object, id, ctx.resolve);
  } catch (err) {
    // resolve.exports throws when the imports map cannot satisfy the
    // requested specifier or conditions.
    if (!ctx.silent) throw err;
  }
}

function resolvePkgField(
  ctx: ResolveContext,
  pkg: object,
  pkgDir: string,
  part: string,
) {
  const remapPart = getBrowserRemap(ctx, pkg, part);
  if (remapPart === false) {
    return false;
  }

  if (remapPart) {
    return resolveRelative(ctx, pkgDir, remapPart);
  }

  if (part && part !== "/") {
    return resolveRelative(ctx, pkgDir, "." + part);
  }

  for (const field of ctx.fields) {
    const value = (pkg as Record<string, unknown>)[field];
    if (typeof value === "string") {
      const resolved = resolveRelative(ctx, pkgDir, value);
      // Like Node's LOAD_AS_DIRECTORY, a field that points at a missing file
      // is not fatal: fall through to the next field and finally to `index`.
      if (resolved !== undefined) return resolved;
    }
  }

  return resolveFile(ctx, pkgDir + "/index");
}

function getBrowserRemap(
  ctx: ResolveContext,
  pkg: object,
  part: string,
): string | false | undefined {
  const remaps =
    ctx.resolve.browser &&
    "browser" in pkg &&
    typeof pkg.browser === "object" &&
    (pkg.browser as Record<string, string | false>);

  if (remaps) {
    let entry = "." + part;
    let remap = remaps[entry];
    if (remap !== undefined) {
      return remap;
    }

    if (entry === ".") {
      // Check `.` and `./`
      entry = "./";
      remap = remaps[entry];
      if (remap !== undefined) {
        return remap;
      }
    }

    for (const ext of ctx.exts) {
      remap = remaps[entry + ext];
      if (remap !== undefined) {
        return remap;
      }
    }

    // try adding `/index` to the end.
    entry += "/index";
    remap = remaps[entry];
    if (remap !== undefined) {
      return remap;
    }

    for (const ext of ctx.exts) {
      remap = remaps[entry + ext];
      if (remap !== undefined) {
        return remap;
      }
    }
  }
}

function normalizeRoot(root: string) {
  const end = root.length - 1;
  // Drop a trailing slash so the boundary compares equal to the canonical
  // directories produced while walking. `dirname` never yields a trailing
  // slash except at a filesystem root ("/" or "C:/"), which we keep as-is.
  return end > 0 &&
    root.charCodeAt(end) === 47 /* "/" */ &&
    !(end === 2 && root.charCodeAt(1) === 58) /* drive root like "C:/" */
    ? root.slice(0, end)
    : root;
}

function joinDir(dir: string) {
  // Append a trailing slash unless `dir` is already a filesystem root ("/" or
  // "C:/"), which avoids emitting a doubled slash when building child paths.
  return dir.charCodeAt(dir.length - 1) === 47 /* "/" */ ? dir : dir + "/";
}

function dirname(dir: string) {
  const i = dir.lastIndexOf("/");

  if (i === 2 && dir[1] === ":") {
    // if windows path like C:\ return including the drive letter and colon.
    return dir.slice(0, 3);
  }

  return dir.slice(0, i) || "/";
}

function join(base: string, part: string): string {
  if (part === "." || part === "./") {
    return base;
  }

  const len = part.length;
  let up = 0;
  let i = 0;

  while (i < len && part[i] === ".") {
    if (
      i + 1 < len &&
      part[i + 1] === "." &&
      (i + 2 === len || part[i + 2] === "/")
    ) {
      up++;
      i += 3;
    } else if (i + 1 === len || part[i + 1] === "/") {
      i += 2;
    } else {
      break;
    }
  }

  let pre = base;
  if (up) {
    let end = base.length;
    while (up--) {
      end = base.lastIndexOf("/", end - 1);
      if (end < 0) return "/";
    }
    pre = base.slice(0, end) || "/";
  }

  if (i >= len) {
    return pre;
  }

  if (pre[pre.length - 1] !== "/") {
    pre += "/";
  }

  return pre + (i ? part.slice(i) : part);
}

function toPosix(file: string) {
  return file[0] === "/" ? file : file.replace(/\\/g, "/");
}
