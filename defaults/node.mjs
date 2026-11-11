import { readFileSync, realpathSync, statSync } from "node:fs";
import module from "node:module";

const fsStatOpts = { throwIfNoEntry: false };
const fsRealPath =
  process.platform === "win32" ? realpathSync : realpathSync.native;

export { isBuiltin as external } from "node:module";
export const fs = {
  isFile(file) {
    try {
      return !!statSync(file, fsStatOpts)?.isFile();
    } catch {
      return false;
    }
  },
  readPkg(file) {
    return JSON.parse(readFileSync(file, "utf8"));
  },
  realpath(file) {
    try {
      return fsRealPath(file);
    } catch {
      return file;
    }
  },
};

// Yarn PnP keeps packages out of `node_modules`. Its runtime, set up before
// any package loads, adds `findPnpApi` to `node:module`, whose API knows
// where each one is; without it there is nothing to ask.
export const findPackage = module.findPnpApi
  ? (name, from) => {
      const api = module.findPnpApi(from);
      if (api) {
        try {
          return api.resolveToUnqualified(name, from) || undefined;
        } catch {
          // Not a dependency PnP knows of from here.
        }
      }
    }
  : undefined;
