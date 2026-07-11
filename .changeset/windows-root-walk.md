---
"resolve-sync": patch
---

Fix an infinite loop when resolution fails from a Windows path: the `node_modules`/`imports` walk terminated only on reaching `root` (default `/`), which a drive-rooted path never equals — `dirname("D:/")` is `"D:/"`. The walk now also stops when a directory is its own parent (the file system root).
