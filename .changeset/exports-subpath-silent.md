---
"resolve-sync": patch
---

Fix resolution of `exports` map subpaths: the requested subpath is now matched against the `exports` map instead of always resolving the package's root entry. Errors thrown while matching `exports`/`imports` maps that cannot satisfy the request now honor the `silent` option (returning `undefined`) instead of always throwing.
