// Resolves under a fake Yarn PnP runtime, set up (as Yarn's is) before
// resolve-sync loads. Takes the package locations PnP knows and the cases as
// JSON, and prints each result or error.
import module from "node:module";

interface Case {
  id: string;
  from: string;
  files: Record<string, string>;
}

const { locations, cases } = JSON.parse(process.argv[2]) as {
  locations: Record<string, string> | null;
  cases: Case[];
};

(module as { findPnpApi?: unknown }).findPnpApi = () =>
  locations && {
    resolveToUnqualified(name: string) {
      if (name in locations) return locations[name];
      throw new Error(`${name} is not a dependency`);
    },
  };

void (async () => {
  const { resolveSync } = await import("..");
  const toPosix = (file: string) => file.replace(/\\/g, "/");
  const results = cases.map(({ id, from, files }) => {
    const windows = from[0] !== "/";
    const fileMap = new Map(
      Object.entries(files).map(([file, data]) => [toPosix(file), data]),
    );
    try {
      return resolveSync(id, {
        from,
        fs: {
          isFile: (file) => fileMap.has(file),
          readPkg: (file) => JSON.parse(fileMap.get(file)!),
          realpath: (file) => (windows ? file.replace(/\//g, "\\") : file),
        },
      });
    } catch (err) {
      return `throws: ${(err as Error).message}`;
    }
  });
  process.stdout.write(JSON.stringify(results));
})();
