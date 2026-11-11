---
"resolve-sync": minor
---

Resolve packages under Yarn Plug'n'Play: when run in Node under PnP, a package is found where PnP keeps it (eg inside its zip in `.yarn/cache`) before looking in `node_modules`.
