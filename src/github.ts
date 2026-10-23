export type Repository = {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  updated_at: string;
  html_url: string;
  homepage: string | null;
  default_branch: string;
  fork: boolean;
};

type GitHubReadme = {
  path: string;
  content: string;
  encoding: string;
};

const owner = "ayaan523";
const repositoryCacheKey = `github-repositories-v2:${owner}`;
const readmeCacheKey = "github-readmes";
const cacheDuration = 60 * 60 * 1000;

export async function getRepositories() {
  const cached = readCache<Repository[]>(repositoryCacheKey);
  if (cached && Date.now() - cached.savedAt < cacheDuration)
    return cached.value;

  const repositories: Repository[] = [];
  let nextUrl: string | null =
    `https://api.github.com/users/${owner}/repos?per_page=100&sort=updated&type=owner`;

  while (nextUrl) {
    const response: Response = await fetch(nextUrl, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!response.ok) {
      const resetAt = Number(response.headers.get("X-RateLimit-Reset"));
      const resetMessage =
        response.status === 403 &&
        response.headers.get("X-RateLimit-Remaining") === "0" &&
        Number.isFinite(resetAt)
          ? ` Rate limit resets at ${new Date(resetAt * 1000).toLocaleTimeString()}.`
          : "";
      if (cached) return cached.value;
      throw new Error(`GitHub API request failed (${response.status}).${resetMessage}`);
    }

    const page = (await response.json()) as Repository[];
    repositories.push(
      ...page.map((repository) => ({
        ...repository,
        topics: Array.isArray(repository.topics) ? repository.topics : [],
      }))
    );
    const nextLink = response.headers
      .get("Link")
      ?.split(",")
      .find((link) => link.includes('rel="next"'));
    nextUrl = nextLink?.match(/<([^>]+)>/)?.[1] ?? null;
  }

  const publicRepositories = repositories.filter((repository) => !repository.fork);
  writeCache(repositoryCacheKey, publicRepositories);
  return publicRepositories;
}

export async function getReadme(repository: Repository, readmePath?: string) {
  const cached = readCache<Record<string, string>>(readmeCacheKey);
  const cachedMarkdown = cached?.value[repository.full_name];
  if (cachedMarkdown && Date.now() - cached.savedAt < cacheDuration)
    return cachedMarkdown;

  try {
    const filenames = [
      ...(readmePath ? [readmePath] : []),
      "README.md",
      "readme.md",
      "README.markdown",
      "README",
    ];
    for (const filename of filenames) {
      const path = `https://raw.githubusercontent.com/${repository.full_name}/${encodeURIComponent(repository.default_branch)}/${filename}`;
      const response = await fetch(path);
      if (response.ok) {
        const markdown = resolveReadmeImages(
          await response.text(),
          repository,
          filename
        );
        writeCache(readmeCacheKey, {
          ...(cached?.value ?? {}),
          [repository.full_name]: markdown,
        });
        return markdown;
      }
      if (response.status !== 404)
        throw new Error(`Could not fetch README (${response.status})`);
    }

    const response = await fetch(
      `https://api.github.com/repos/${repository.full_name}/readme`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!response.ok)
      throw new Error(`Could not fetch README (${response.status})`);

    const readme = (await response.json()) as GitHubReadme;
    if (readme.encoding !== "base64")
      throw new Error(`Unsupported README encoding: ${readme.encoding}`);

    const binary = atob(readme.content.replace(/\s/g, ""));
    const content = new TextDecoder().decode(
      Uint8Array.from(binary, (character) => character.charCodeAt(0))
    );
    const markdown = resolveReadmeImages(content, repository, readme.path);
    writeCache(readmeCacheKey, {
      ...(cached?.value ?? {}),
      [repository.full_name]: markdown,
    });
    return markdown;
  } catch (error) {
    if (cachedMarkdown) {
      console.warn(`Using cached README for ${repository.full_name}`, error);
      return cachedMarkdown;
    }
    throw error;
  }
}

function readCache<T>(key: string) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as { savedAt: number; value: T };
    return typeof parsed.savedAt === "number" ? parsed : undefined;
  } catch (error) {
    console.warn(`Unable to read local GitHub cache "${key}"`, error);
    return undefined;
  }
}

function writeCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch (error) {
    console.warn(`Unable to save local GitHub cache "${key}"`, error);
  }
}

function resolveReadmeImages(
  markdown: string,
  repository: Repository,
  readmePath: string
) {
  const rootUrl = new URL(
    `https://raw.githubusercontent.com/${repository.full_name}/${repository.default_branch}/`
  );
  const baseUrl = new URL(readmePath, rootUrl);
  const withMarkdownImages = markdown.replace(
    /(!\[[^\]]*\]\()([^)]+)(\))/g,
    (_match, prefix: string, source: string, suffix: string) => {
      const imageSource = source.replace(/\s+["'][^"']*["']$/, "");
      try {
        const imageUrl = /^https?:\/\//i.test(imageSource)
          ? new URL(imageSource)
          : new URL(
              imageSource.startsWith("/") ? imageSource.slice(1) : imageSource,
              imageSource.startsWith("/") ? rootUrl : baseUrl
            );

        if (
          imageUrl.hostname === "github.com" &&
          imageUrl.pathname.includes("/blob/")
        ) {
          imageUrl.hostname = "raw.githubusercontent.com";
          imageUrl.pathname = imageUrl.pathname.replace("/blob/", "/");
        }
        return `${prefix}${imageUrl.href}${suffix}`;
      } catch {
        return `${prefix}${source}${suffix}`;
      }
    }
  );

  return withMarkdownImages.replace(
    /<img\b([^>]*?)\bsrc=["']([^"']+)["']([^>]*)>/gi,
    (_match, before: string, source: string, after: string) => {
      const alt =
        `${before} ${after}`.match(/\balt=["']([^"']*)["']/i)?.[1] ?? "";
      try {
        const url = /^https?:\/\//i.test(source)
          ? new URL(source)
          : new URL(
              source.startsWith("/") ? source.slice(1) : source,
              source.startsWith("/") ? rootUrl : baseUrl
            );
        return `![${alt}](${url.href})`;
      } catch {
        return `![${alt}](${source})`;
      }
    }
  );
}
