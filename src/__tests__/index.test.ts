import assert from "node:assert/strict";

import { type ResolveOptions, resolveSync } from "..";

describe("resolve - relative imports", () => {
  it("resolves a relative file with extension", () => {
    const result = resolveSync("./file.js", {
      from: "/project/src/index.js",
      fs: vfs(["/project/src/file.js"]),
    });

    assert.equal(result, "/project/src/file.js");
  });

  it("resolves a relative file without extension", () => {
    const result = resolveSync("./file", {
      from: "/project/src/index.js",
      fs: vfs(["/project/src/file.js"]),
    });

    assert.equal(result, "/project/src/file.js");
  });

  it("resolves the first matching extension", () => {
    const fs = vfs(["/project/src/file.json", "/project/src/file.js"]);

    assert.equal(
      resolveSync("./file", {
        fs,
        from: "/project/src/index.js",
        exts: [".json", ".js"],
      }),
      "/project/src/file.json",
    );

    assert.equal(
      resolveSync("./file", {
        fs,
        from: "/project/src/index.js",
        exts: [".js", ".json"],
      }),
      "/project/src/file.js",
    );
  });

  it("resolves index.js in a relative folder", () => {
    const result = resolveSync("./dir", {
      from: "/project/src/main.js",
      fs: vfs(["/project/src/dir/index.js"]),
    });

    assert.equal(result, "/project/src/dir/index.js");
  });

  it("resolves a relative parent directory file", () => {
    const result = resolveSync("../file.js", {
      from: "/project/src/index.js",
      fs: vfs(["/project/file.js"]),
    });

    assert.equal(result, "/project/file.js");
  });

  it("resolves './' as directory index", () => {
    const result = resolveSync("./", {
      from: "/project/src/index.js",
      fs: vfs(["/project/src/index.js"]),
    });

    assert.equal(result, "/project/src/index.js");
  });

  it("resolves '../' as parent directory index", () => {
    const result = resolveSync("../", {
      from: "/project/src/index.js",
      fs: vfs(["/project/index.js"]),
    });

    assert.equal(result, "/project/index.js");
  });

  it("resolves '.' as directory index", () => {
    const result = resolveSync(".", {
      from: "/project/src/index.js",
      fs: vfs(["/project/src/index.js"]),
    });

    assert.equal(result, "/project/src/index.js");
  });

  it("resolves '..' as parent directory index", () => {
    const result = resolveSync("..", {
      from: "/project/src/index.js",
      fs: vfs(["/project/index.js"]),
    });

    assert.equal(result, "/project/index.js");
  });

  it('resolved when file name starts with ".."', () => {
    const result = resolveSync("./..file.js", {
      from: "/project/src/index.js",
      fs: vfs(["/project/src/..file.js"]),
    });

    assert.equal(result, "/project/src/..file.js");
  });
});

describe("resolve - package imports", () => {
  it("resolves a main entry from package.json", () => {
    const result = resolveSync("pkg", {
      from: "/project/src/index.js",
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "main.js",
          }),
        ],
        "/project/node_modules/pkg/main.js",
      ]),
    });

    assert.equal(result, "/project/node_modules/pkg/main.js");
  });

  it("resolves a random internal file from a package without 'exports' field", () => {
    const result = resolveSync("pkg/utils/helper.js", {
      from: "/project/src/index.js",
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "./main.js",
          }),
        ],
        "/project/node_modules/pkg/main.js",
        "/project/node_modules/pkg/utils/helper.js",
      ]),
    });

    assert.equal(result, "/project/node_modules/pkg/utils/helper.js");
  });

  it("resolves package with browser entry", () => {
    const result = resolveSync("pkg", {
      from: "/project/src/index.js",
      browser: true,
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            browser: "browser.js",
          }),
        ],
        "/project/node_modules/pkg/browser.js",
      ]),
    });

    assert.equal(result, "/project/node_modules/pkg/browser.js");
  });

  it("uses browser field override", () => {
    const result = resolveSync("pkg/main", {
      from: "/project/src/index.js",
      browser: true,
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "main.js",
            browser: {
              "./main.js": "./browser.js",
            },
          }),
        ],
        "/project/node_modules/pkg/browser.js",
      ]),
    });

    assert.equal(result, "/project/node_modules/pkg/browser.js");
  });

  it("handles browser field remap to false", () => {
    const result = resolveSync("pkg/main", {
      from: "/project/src/index.js",
      browser: true,
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "main.js",
            browser: { "./main.js": false },
          }),
        ],
        "/project/node_modules/pkg/main.js",
      ]),
    });
    assert.equal(result, false);
  });

  it("throws if browser remap target does not exist", () => {
    assert.throws(() => {
      resolveSync("pkg/main.js", {
        from: "/project/src/index.js",
        browser: true,
        fs: vfs([
          [
            "/project/node_modules/pkg/package.json",
            JSON.stringify({
              main: "main.js",
              browser: { "./main.js": "./browser.js" },
            }),
          ],
          // browser.js does not exist
        ]),
      });
    }, /Could not resolve entry/);
  });

  it("ignores browser remap for unrelated files", () => {
    const result = resolveSync("pkg/other.js", {
      from: "/project/src/index.js",
      browser: true,
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "main.js",
            browser: { "./main.js": "./browser.js" },
          }),
        ],
        "/project/node_modules/pkg/other.js",
      ]),
    });
    assert.equal(result, "/project/node_modules/pkg/other.js");
  });

  it("remaps a file using browser field with extensionless key", () => {
    const result = resolveSync("pkg/main", {
      from: "/project/src/index.js",
      browser: true,
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "main.js",
            browser: { "./main": "./browser.js" },
          }),
        ],
        "/project/node_modules/pkg/browser.js",
      ]),
    });
    assert.equal(result, "/project/node_modules/pkg/browser.js");
  });

  it("remaps using browser field with /index and extension variant fallback to .js", () => {
    const result = resolveSync("pkg/folder/file", {
      from: "/project/src/index.js",
      browser: true,
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "main.js",
            browser: {
              "./folder/file/index.js": "./browserFolder/fileIndex.js",
            },
          }),
        ],
        "/project/node_modules/pkg/browserFolder/fileIndex.js",
      ]),
    });
    assert.equal(
      result,
      "/project/node_modules/pkg/browserFolder/fileIndex.js",
    );
  });

  it("remaps using browser field with /index and extension variant fallback to .json", () => {
    const result = resolveSync("pkg/folder/file", {
      from: "/project/src/index.js",
      browser: true,
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "main.js",
            browser: {
              "./folder/file/index.json": "./browserFolder/fileIndex.json",
            },
          }),
        ],
        "/project/node_modules/pkg/browserFolder/fileIndex.json",
      ]),
    });
    assert.equal(
      result,
      "/project/node_modules/pkg/browserFolder/fileIndex.json",
    );
  });

  it("remaps using browser field with /index and extensionless key and both .js and .json present", () => {
    const result = resolveSync("pkg/folder/file", {
      from: "/project/src/index.js",
      browser: true,
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "main.js",
            browser: {
              "./folder/file/index": "./browserFolder/fileIndex.js",
              "./folder/file/index.json": "./browserFolder/fileIndex.json",
            },
          }),
        ],
        "/project/node_modules/pkg/browserFolder/fileIndex.js",
        "/project/node_modules/pkg/browserFolder/fileIndex.json",
      ]),
    });
    assert.equal(
      result,
      "/project/node_modules/pkg/browserFolder/fileIndex.js",
    );
  });

  it("falls back to index if main is missing", () => {
    const result = resolveSync("pkg", {
      from: "/project/src/index.js",
      fs: vfs([
        ["/project/node_modules/pkg/package.json", JSON.stringify({})],
        "/project/node_modules/pkg/index.js",
      ]),
    });

    assert.equal(result, "/project/node_modules/pkg/index.js");
  });

  it("remaps a file using browser field with './' key", () => {
    const fs = vfs([
      [
        "/project/node_modules/pkg/package.json",
        JSON.stringify({
          main: "main.js",
          browser: { "./main.js": "./browser.js", "./": "./browserIndex.js" },
        }),
      ],
      "/project/node_modules/pkg/browser.js",
      "/project/node_modules/pkg/browserIndex.js",
    ]);
    assert.equal(
      resolveSync("pkg/main.js", {
        from: "/project/src/index.js",
        browser: true,
        fs: fs,
      }),
      "/project/node_modules/pkg/browser.js",
    );

    assert.equal(
      resolveSync("pkg", {
        from: "/project/src/index.js",
        browser: true,
        fs: fs,
      }),
      "/project/node_modules/pkg/browserIndex.js",
    );
  });

  it("remaps a file using browser field with extension variant", () => {
    const result = resolveSync("pkg/main.js", {
      from: "/project/src/index.js",
      browser: true,
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "main.js",
            browser: {
              "./main.js": "./browser.js",
              "./main.js.map": "./browser.js.map",
            },
          }),
        ],
        "/project/node_modules/pkg/browser.js",
        "/project/node_modules/pkg/browser.js.map",
      ]),
    });
    assert.equal(result, "/project/node_modules/pkg/browser.js");
  });

  it("remaps a file using browser field with /index and extension", () => {
    const result = resolveSync("pkg/folder/file", {
      from: "/project/src/index.js",
      browser: true,
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "main.js",
            browser: {
              "./folder/file/index.js": "./browserFolder/fileIndex.js",
            },
          }),
        ],
        "/project/node_modules/pkg/browserFolder/fileIndex.js",
      ]),
    });
    assert.equal(
      result,
      "/project/node_modules/pkg/browserFolder/fileIndex.js",
    );
  });

  it("remaps a file using browser field with /index and extension fallback", () => {
    const result = resolveSync("pkg/folder/file", {
      from: "/project/src/index.js",
      browser: true,
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "main.js",
            browser: {
              "./folder/file/index.js": "./browserFolder/fileIndex.js",
              "./folder/file/index.json": "./browserFolder/fileIndex.json",
            },
          }),
        ],
        "/project/node_modules/pkg/browserFolder/fileIndex.js",
        "/project/node_modules/pkg/browserFolder/fileIndex.json",
      ]),
    });
    assert.equal(
      result,
      "/project/node_modules/pkg/browserFolder/fileIndex.js",
    );
  });

  it("remaps a file using browser field with /index and extension fallback to .json", () => {
    const result = resolveSync("pkg/folder/file", {
      from: "/project/src/index.js",
      browser: true,
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "main.js",
            browser: {
              "./folder/file/index.json": "./browserFolder/fileIndex.json",
            },
          }),
        ],
        "/project/node_modules/pkg/browserFolder/fileIndex.json",
      ]),
    });
    assert.equal(
      result,
      "/project/node_modules/pkg/browserFolder/fileIndex.json",
    );
  });

  it("returns false if browser remap is false for extensionless key", () => {
    const result = resolveSync("pkg/main", {
      from: "/project/src/index.js",
      browser: true,
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "main.js",
            browser: { "./main": false },
          }),
        ],
        "/project/node_modules/pkg/main.js",
      ]),
    });
    assert.equal(result, false);
  });

  it("returns false if browser remap is false for /index variant", () => {
    const result = resolveSync("pkg/folder/file", {
      from: "/project/src/index.js",
      browser: true,
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            main: "main.js",
            browser: { "./folder/file/index.js": false },
          }),
        ],
        "/project/node_modules/pkg/folder/file/index.js",
      ]),
    });
    assert.equal(result, false);
  });
});

describe("resolve - package exports", () => {
  it("resolves 'exports' entry point", () => {
    const result = resolveSync("pkg", {
      from: "/project/src/index.js",
      fs: vfs([
        [
          "/project/node_modules/pkg/package.json",
          JSON.stringify({
            exports: {
              ".": "./main.js",
            },
          }),
        ],
        "/project/node_modules/pkg/main.js",
      ]),
    });

    assert.equal(result, "/project/node_modules/pkg/main.js");
  });

  it("respects 'exports' conditions", () => {
    const fs = vfs([
      [
        "/project/node_modules/pkg/package.json",
        JSON.stringify({
          exports: {
            ".": {
              import: "./import.js",
              require: "./require.js",
            },
          },
        }),
      ],
      "/project/node_modules/pkg/require.js",
    ]);

    const result = resolveSync("pkg", {
      fs,
      from: "/project/src/index.js",
      require: true,
    });

    assert.equal(result, "/project/node_modules/pkg/require.js");
  });

  it("throws if 'exports' has no valid match", () => {
    const fs = vfs([
      [
        "/project/node_modules/pkg/package.json",
        JSON.stringify({
          exports: {},
        }),
      ],
      "/project/node_modules/pkg/index.js",
    ]);

    assert.throws(() => {
      resolveSync("pkg", {
        fs,
        from: "/project/src/index.js",
      });
    }, /Missing "." specifier /);
  });

  it("throws when missing module from root", () => {
    assert.throws(() => {
      resolveSync("missing", {
        root: "/",
        from: "/project/src/index.js",
        fs: vfs([]),
      });
    }, /Cannot find module 'missing'/);
  });
});

describe("resolve - subpath imports", () => {
  it("resolves a subpath import from 'imports'", () => {
    const result = resolveSync("#alias", {
      from: "/project/src/index.js",
      fs: vfs([
        [
          "/project/package.json",
          JSON.stringify({
            imports: {
              "#alias": "./src/aliased.js",
            },
          }),
        ],
        "/project/src/aliased.js",
      ]),
    });

    assert.strictEqual(result, "/project/src/aliased.js");
  });

  it("resolves nested subpath import", () => {
    const result = resolveSync("#nested/alias", {
      from: "/project/src/main.js",
      fs: vfs([
        [
          "/project/package.json",
          JSON.stringify({
            imports: {
              "#nested/alias": "./src/deep/alias.js",
            },
          }),
        ],
        "/project/src/deep/alias.js",
      ]),
    });

    assert.equal(result, "/project/src/deep/alias.js");
  });

  it("resolves subpath first existing match", () => {
    const fs = vfs([
      [
        "/project/package.json",
        JSON.stringify({
          imports: {
            "#nested/*": ["./src/deep/*.ts", "./src/deep/*.js"],
          },
        }),
      ],
      "/project/src/deep/a.js",
      "/project/src/deep/a.ts",
      "/project/src/deep/b.js",
    ]);

    assert.equal(
      resolveSync("#nested/a", {
        fs,
        from: "/project/src/main.js",
      }),
      "/project/src/deep/a.ts",
    );

    assert.equal(
      resolveSync("#nested/b", {
        fs,
        from: "/project/src/main.js",
      }),
      "/project/src/deep/b.js",
    );
  });

  it("fails on missing subpath specifier", () => {
    const fs = vfs([
      [
        "/project/package.json",
        JSON.stringify({
          imports: {
            "#known": "./src/file.js",
          },
        }),
      ],
      "/project/src/file.js",
    ]);

    assert.throws(() => {
      resolveSync("#unknown", {
        fs,
        from: "/project/src/main.js",
      });
    }, /Missing "#unknown" specifier/);
  });

  it("fails on subpath specifier with no imports defined", () => {
    const fs = vfs([
      ["/project/package.json", JSON.stringify({})],
      "/project/src/file.js",
    ]);

    assert.throws(() => {
      resolveSync("#known", {
        fs,
        from: "/project/src/main.js",
      });
    }, /Cannot find module '#known'/);
  });

  it("fails on subpath specifier when no match exists", () => {
    const fs = vfs([
      [
        "/project/package.json",
        JSON.stringify({
          imports: {
            "#foo/*": "./src/*.js",
          },
        }),
      ],
      "/project/src/a.js",
    ]);

    assert.throws(() => {
      resolveSync("#foo/b", {
        fs,
        from: "/project/src/main.js",
      });
    }, /Cannot find module '#foo\/b'/);
  });
});

describe("resolve - error cases", () => {
  it("throws when file doesn't exist", () => {
    assert.throws(() => {
      resolveSync("./missing.js", {
        from: "/project/src/index.js",
        fs: vfs([]),
      });
    }, /'.\/missing.js' from '\/project\/src\/index.js'/);
  });

  it("throws if exports or main can't be resolved", () => {
    assert.throws(() => {
      resolveSync("pkg", {
        from: "/project/src/index.js",
        fs: vfs([
          [
            "/project/node_modules/pkg/package.json",
            JSON.stringify({
              main: "missing.js",
            }),
          ],
        ]),
      });
    }, /entry for package '\/project\/node_modules\/pkg\/package.json'/);
  });

  it("throws on invalid package.json", () => {
    assert.throws(() => {
      resolveSync("pkg", {
        from: "/project/src/index.js",
        fs: vfs([
          ["/project/node_modules/pkg/package.json", "null"],
          "/project/node_modules/pkg/main.js",
        ]),
      });
    }, /Invalid package/);
  });
});

describe("resolve - windows path normalization", () => {
  it("normalizes backslash in 'from' and resolves relative file", () => {
    const result = resolveSync("./file.js", {
      root: "C:\\",
      from: "C:\\project\\src\\index.js",
      fs: windowsVfs(["C:\\project\\src\\file.js"]),
    });
    assert.equal(result, "C:\\project\\src\\file.js");
  });

  it("resolves parent directory file", () => {
    const result = resolveSync("../file.js", {
      root: "C:\\",
      from: "C:\\project\\src\\index.js",
      fs: windowsVfs(["C:\\project\\file.js"]),
    });
    assert.equal(result, "C:\\project\\file.js");
  });

  it("resolves index file in directory", () => {
    const result = resolveSync("./dir", {
      root: "C:\\",
      from: "C:\\project\\src\\main.js",
      fs: windowsVfs(["C:\\project\\src\\dir\\index.js"]),
    });
    assert.equal(result, "C:\\project\\src\\dir\\index.js");
  });

  it("resolves package main entry with windows paths", () => {
    const result = resolveSync("pkg", {
      root: "C:\\",
      from: "C:\\project\\src\\index.js",
      fs: windowsVfs([
        [
          "C:\\project\\node_modules\\pkg\\package.json",
          JSON.stringify({ main: "main.js" }),
        ],
        "C:\\project\\node_modules\\pkg\\main.js",
      ]),
    });
    assert.equal(result, "C:\\project\\node_modules\\pkg\\main.js");
  });

  it("resolves extensionless file with windows paths", () => {
    const result = resolveSync("./file", {
      root: "C:\\",
      from: "C:\\project\\src\\index.js",
      fs: windowsVfs(["C:\\project\\src\\file.js"]),
      exts: [".js"],
    });
    assert.equal(result, "C:\\project\\src\\file.js");
  });

  it("resolves . and .. as directory index with windows paths", () => {
    const resultDot = resolveSync(".", {
      root: "C:\\",
      from: "C:\\project\\src\\index.js",
      fs: windowsVfs(["C:\\project\\src\\index.js"]),
    });
    assert.equal(resultDot, "C:\\project\\src\\index.js");

    const resultDotDot = resolveSync("..", {
      root: "C:\\",
      from: "C:\\project\\src\\index.js",
      fs: windowsVfs(["C:\\project\\index.js"]),
    });
    assert.equal(resultDotDot, "C:\\project\\index.js");
  });

  it("resolves a folder at the root", () => {
    const result = resolveSync("../../test", {
      root: "C:\\",
      from: "C:\\project\\src\\index.js",
      fs: windowsVfs(["C:\\test\\index.js"]),
    });
    assert.equal(result, "C:\\test\\index.js");
  });

  it("throws when missing module from root", () => {
    assert.throws(() => {
      resolveSync("missing", {
        root: "C:\\",
        from: "C:\\project\\src\\index.js",
        fs: windowsVfs([]),
      });
    }, /Cannot find module 'missing'/);
  });
});

describe("resolve - external option", () => {
  it("returns the id as-is when external returns true", () => {
    const result = resolveSync("external-module", {
      from: "/project/src/index.js",
      external: (id) => id === "external-module",
      fs: vfs(["/project/src/file.js"]),
    });
    assert.equal(result, "external-module");
  });

  it("resolves normally when external returns false", () => {
    const result = resolveSync("./file.js", {
      from: "/project/src/index.js",
      external: (_) => false,
      fs: vfs(["/project/src/file.js"]),
    });
    assert.equal(result, "/project/src/file.js");
  });
});

describe("resolve - silent option", () => {
  it("returns undefined instead of throwing when module is missing and silent is true", () => {
    const result = resolveSync("./missing.js", {
      from: "/project/src/index.js",
      fs: vfs(["/project/src/file.js"]),
      silent: true,
    });
    assert.equal(result, undefined);
  });
});

function vfs(files: (string | [string, string])[]): ResolveOptions["fs"] {
  const fileMap: Record<string, string> = {};
  for (const entry of files) {
    if (typeof entry === "string") {
      fileMap[entry] = "";
    } else {
      fileMap[entry[0]] = entry[1];
    }
  }
  return {
    isFile(file: string) {
      return file in fileMap;
    },
    readPkg(file: string) {
      return JSON.parse(fileMap[file]);
    },
  };
}

function windowsVfs(
  files: (string | [string, string])[],
): ResolveOptions["fs"] {
  const fileMap: Record<string, string> = {};
  for (const entry of files) {
    if (typeof entry === "string") {
      fileMap[toPosix(entry)] = "";
    } else {
      fileMap[toPosix(entry[0])] = entry[1];
    }
  }
  return {
    isFile(file: string) {
      return file in fileMap;
    },
    readPkg(file: string) {
      return JSON.parse(fileMap[file]);
    },
    realpath(file: string) {
      return fromPosix(file);
    },
  };
}

function toPosix(str: string) {
  return str.replace(/\\/g, "/");
}

function fromPosix(str: string) {
  return str.replace(/\//g, "\\");
}
