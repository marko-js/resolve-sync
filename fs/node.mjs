import { readFileSync, realpathSync, statSync } from "node:fs";

const fsStatOpts = { throwIfNoEntry: false };
const fsRealPath =
  process.platform === "win32" ? realpathSync : realpathSync.native;

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
    return fsRealPath(file);
  },
};
