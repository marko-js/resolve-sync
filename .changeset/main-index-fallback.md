---
"resolve-sync": patch
---

Fall back to `index` when a package/directory entry field (e.g. `main`) points at a file that does not exist, matching Node's `LOAD_AS_DIRECTORY` and the `resolve`/webpack resolvers. Previously a declared-but-broken field caused resolution to throw even when an `index` file was present. A later field in `fields` is now also tried before falling back.
