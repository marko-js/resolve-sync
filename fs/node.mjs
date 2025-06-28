import { readFileSync, statSync } from "node:fs";

const fsStatOpts = { throwIfNoEntry: false };

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
};
