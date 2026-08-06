import FileSystemBash, { FileSystemType } from "../fileSystemBash";

export default function cd(print: (s: string, md?: boolean) => void, path: FileSystemType) {
  const fileSystem = FileSystemBash();
  const docs = {
    name: "cd",
    short: "change directory",
    long: "",
  };

  const app = (args: string[], options: string[]) => {
    if (options.find((o) => o === "-h" || o === '-help')) {
      print(`\n${docs.name} – ${docs.short}`);
      return;
    }

    if (args.length === 0 || args[0] === "") {
      path.p = fileSystem.goHome();
      return;
    }
    const operation = fileSystem.goto(path.p, args[0]);
    console.log(operation);

    if (!operation) {
      // Give helpful hint if at root
      const currentPathStr = path.p.map(p => p.name).join("/").replace("//", "/");
      if (currentPathStr === "/") {
        print(`\nNo such file or directory: ${args[0]}`);
        print(`\nHint: You're at root (/). Try one of these:`);
        print(`  cd ~          (go home)`);
        print(`  cd home/user  (go home)`);
        print(`  cd home/user/${args[0]}  (full path)`);
      } else {
        print(`\nNo such file or directory: ${args[0]}`);
      }
      return;
    }
    if (!("children" in (operation.at(-1) as any))) {
      print(`\n${operation.at(-1)?.name}: not a directory`);
      return;
    }

    path.p = operation as any;
  };
  return { docs, app };
}