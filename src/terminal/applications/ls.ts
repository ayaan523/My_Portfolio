import FileSystemBash, { FileSystemType } from "../fileSystemBash";

export default function ls(
  print: (s: string, md?: boolean) => void,
  path: FileSystemType
) {
  const fileSystem = FileSystemBash();
  const docs = {
    name: "ls",
    short: "list directory contents",
    long: "",
  };

  const app = (args: string[], options: string[]) => {
    if (options.find((o) => o === "-h" || o === '-help')) {
      print(`\n${docs.name} – ${docs.short}`);
      return;
    }

    let out = "\n";
    const files = fileSystem.getChildren(path.p);
    
    for (const f of files) {
      if ("children" in f) {
        out += `${f.name}/\n`;  // folders with trailing /
      } else {
        out += `${f.name}\n`;
      }
    }
    
    // Show current path hint
    const pathStr = path.p.map(p => p.name).join("/").replace("//", "/");
    const displayPath = pathStr.replace(/^\/home\/user/, "~");
    if (displayPath === "~") {
      out += `\n(You are home)`;
    } else if (displayPath === "/") {
      out += `\n(You are at root. Type "cd" to go home)`;
    }
    
    print(out);
  };
  return { docs, app };
}