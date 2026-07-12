---
"resolve-sync": patch
---

Fix the `root` boundary excluding the root directory itself. The `node_modules`/`imports` walk terminated _before_ examining `root` whenever `from` was nested below it, so `<root>/node_modules` and a `package.json` at `<root>` (for `#imports`) were never searched — breaking the documented case of setting `root` to a project directory whose dependencies live in `<root>/node_modules`. The walk now includes `root` and stops above it, and no longer probes doubled-slash paths (e.g. `//node_modules`) at a file system root. A trailing slash on `root` is also normalized.
