import { exports, imports } from "resolve.exports";

import { external as defaultExternal, fs as defaultFS } from "#defaults";
export interface ResolveOptions {
  from: string;
  root?: string;
  exts?: string[];
  fields?: string[];
  require?: boolean;
  browser?: boolean;
  external?: (id: string) => boolean;
  conditions?: string[];
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

export function resolveSync(id: string, opts: ResolveOptions): string | false {
  const ctx = toContext(opts);
  const resolved = resolveId(ctx, id);

  if (resolved === false) {
    return false;
  }

  if (!resolved) {
    throw new Error(`Cannot find module '${id}' from '${ctx.from}'`);
  }

  return ctx.realpath(resolved);
}

function toContext(opts: ResolveOptions): ResolveContext {
  const fs = opts.fs || defaultFS;
  const realpath = fs.realpath || identity;
  const root = toPosix(opts.root || "/");
  const from = toPosix(realpath(opts.from));
  const fromDir = dirname(from);
  const browser = !!opts.browser;
  const require = !!opts.require;
  return {
    root,
    from,
    fromDir,
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
  let dir = fromDir;
  do {
    const pkgFile = dir + "/package.json";
    if (ctx.isFile(pkgFile)) {
      return resolveFirst(
        ctx,
        dir,
        imports(ctx.readPkg(pkgFile), id, ctx.resolve),
      );
    }
    dir = dirname(dir);
  } while (dir !== ctx.root);
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

  do {
    const resolved = resolvePkgPart(ctx, dir + "/node_modules/" + name, part);
    if (resolved !== undefined) return resolved;
    dir = dirname(dir);
  } while (dir !== ctx.root);
}

function resolvePkgPart(ctx: ResolveContext, pkgDir: string, part: string) {
  const pkgFile = pkgDir + "/package.json";
  if (ctx.isFile(pkgFile)) {
    const pkg = ctx.readPkg(pkgFile);

    if (!pkg || typeof pkg !== "object") {
      throw new Error(`Invalid package '${pkgFile}' loaded by '${ctx.from}'.`);
    }

    const resolved =
      "exports" in pkg
        ? resolveFirst(ctx, pkgDir, exports(pkg, ".", ctx.resolve))
        : resolvePkgField(ctx, pkg, pkgDir, part);

    if (resolved === undefined) {
      throw new Error(
        `Could not resolve entry for package '${pkgFile}' loaded by '${ctx.from}'.`,
      );
    }

    return resolved;
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
      return resolveRelative(ctx, pkgDir, value);
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
