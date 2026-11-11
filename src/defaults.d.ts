import type { ResolveOptions } from "resolve-sync";
export const fs: NonNullable<ResolveOptions["fs"]>;
export const external: NonNullable<ResolveOptions["external"]>;
/** Finds an installed package's directory other than in `node_modules`, when something can. */
export const findPackage:
  | ((name: string, from: string) => string | undefined)
  | undefined;
