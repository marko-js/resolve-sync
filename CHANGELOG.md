# resolve-sync

## 1.2.2

### Patch Changes

- [#12](https://github.com/marko-js/resolve-sync/pull/12) [`93fe85c`](https://github.com/marko-js/resolve-sync/commit/93fe85c17121b6404b0252e6d76b559876090971) Thanks [@DylanPiercey](https://github.com/DylanPiercey)! - Fix an infinite loop when resolution fails from a Windows path: the `node_modules`/`imports` walk terminated only on reaching `root` (default `/`), which a drive-rooted path never equals — `dirname("D:/")` is `"D:/"`. The walk now also stops when a directory is its own parent (the file system root).

## 1.2.1

### Patch Changes

- [#10](https://github.com/marko-js/resolve-sync/pull/10) [`f67474a`](https://github.com/marko-js/resolve-sync/commit/f67474a530ee6b9310b25cbf42652d08f208e3ef) Thanks [@DylanPiercey](https://github.com/DylanPiercey)! - Fix resolution of `exports` map subpaths: the requested subpath is now matched against the `exports` map instead of always resolving the package's root entry. Errors thrown while matching `exports`/`imports` maps that cannot satisfy the request now honor the `silent` option (returning `undefined`) instead of always throwing.

## 1.2.0

### Minor Changes

- [#7](https://github.com/marko-js/resolve-sync/pull/7) [`30ff1b6`](https://github.com/marko-js/resolve-sync/commit/30ff1b6020b758ee86f81cf9596039fdfea901e7) Thanks [@DylanPiercey](https://github.com/DylanPiercey)! - Add "silent" config option to gracefully handle missing resolved paths.

## 1.1.0

### Minor Changes

- [#4](https://github.com/marko-js/resolve-sync/pull/4) [`0a1e794`](https://github.com/marko-js/resolve-sync/commit/0a1e794d894c207462d6905c1f63c8d1eb266578) Thanks [@DylanPiercey](https://github.com/DylanPiercey)! - Add preserveSymlinks option.

- [#4](https://github.com/marko-js/resolve-sync/pull/4) [`8b999f9`](https://github.com/marko-js/resolve-sync/commit/8b999f9fa8afd6695535be595300b03b7f61cd5c) Thanks [@DylanPiercey](https://github.com/DylanPiercey)! - Add "external" option.
