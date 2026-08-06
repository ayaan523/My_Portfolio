import FileSystemBash, {
  FileBash,
  FileSystemType,
  FolderBash,
} from "../fileSystemBash";

export default function show(
  print: (s: string, md?: boolean) => void,
  path: FileSystemType
) {
  const fileSystem = FileSystemBash();
  const docs = {
    name: "show",
    short: "render markdown (.md) files",
    long: "",
  };

  const app = (args: string[], options: string[]) => {
    if (options.find((o) => o === "-h" || o === "-help")) {
      print(`\n${docs.name} – ${docs.short}`);
      return;
    }
    if (options.find((o) => o === "-a" || o === "-all")) {
      let allStr: string = "";
      const files = fileSystem.goHome().at(-1);
      if (!files) return;

      const showAll = (p: (FolderBash | FileBash)[]) => {
        if (!p) return;

        p.forEach((e) => {
          if (e.name === "title") return;

          if (e.name === "projects") {
            allStr += "\n\n\n\n# Projects";
          }

          if (e.name.match(".md")) {
            allStr += (e as any as FileBash).data;
            return;
          }

          showAll((e as any).children);
        });
      };

      showAll(files.children);

      print(allStr, true);

      return;
    }

    if (args.length === 0) {
      // List available .md files in current directory
      const children = fileSystem.getChildren(path.p);
      const mdFiles = children.filter((f: any) => f.name.endsWith(".md"));
      const folders = children.filter((f: any) => "children" in f);

      print(`\nUsage: show <filename.md>`);
      
      if (mdFiles.length > 0) {
        print(`\n.md files here:`);
        for (const f of mdFiles) {
          print(`  ${f.name}`);
        }
      }
      
      if (folders.length > 0) {
        print(`\nFolders you can cd into:`);
        for (const f of folders) {
          print(`  ${f.name}/`);
        }
      }
      
      print(`\nTip: "show -all" to view everything at once`);
      return;
    }

    const file = fileSystem.goto(path.p, args[0])?.at(-1);
    if (!file) {
      print(`\nNo such file or directory: ${args[0]}`);
      return;
    }

    if (!("data" in file)) {
      print(`\n${file.name}: not a file (try cd ${file.name})`);
      return;
    }

    print(file.data, true);
  };
  return { docs, app };
}