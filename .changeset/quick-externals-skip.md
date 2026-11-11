---
"resolve-sync": patch
---

Return an external id (eg a builtin like `fs`) as given instead of canonicalizing it as a path, which returned a local `./fs` when one existed and made resolving a builtin about a hundred times slower. Like Node, never look for a package in a `node_modules` folder's own `node_modules`.
