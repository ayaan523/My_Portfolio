import { getReadme, getRepositories, Repository } from "../../github";

export default function projects(
  print: (text: string, markdown?: boolean) => void
) {
  const app = async (args: string[]) => {
    print("Loading GitHub projects...\n");

    try {
      const repositories = await getRepositories();
      const repositoryName = args[0]?.toLowerCase();

      if (!repositoryName) {
        if (repositories.length === 0) {
          print("No public, non-fork repositories found.");
          return;
        }

        print(
          repositories
            .map((repository) => {
              const details = [
                repository.language,
                repository.description,
                `updated ${new Date(repository.updated_at).toLocaleDateString()}`,
              ].filter(Boolean);
              return `${repository.name}\n  ${details.join(" | ")}`;
            })
            .join("\n\n")
        );
        print('\nRun "projects <repository-name>" to view its README.');
        return;
      }

      const repository = repositories.find(
        (item) => item.name.toLowerCase() === repositoryName
      );
      if (!repository) {
        print(`Repository not found: ${args[0]}`);
        return;
      }

      const markdown = [
        `# ${repository.name}`,
        repository.description ?? "",
        `Repository: ${repository.html_url}`,
        "",
        await getReadme(repository),
      ]
        .filter(Boolean)
        .join("\n\n");
      print(markdown, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      print(`Unable to load GitHub projects: ${message}`);
    }
  };

  return {
    docs: {
      name: "projects",
      short: "list GitHub projects or view a project README",
      long: "",
    },
    app,
  };
}
