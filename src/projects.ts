import { getReadme, getRepositories, Repository } from "./github";

function safeUrl(value: string, base?: string) {
  try {
    const url = base ? new URL(value, base) : new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function addInlineContent(parent: HTMLElement, text: string, repository: Repository) {
  const token =
    /(!?)\[([^\]]*)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = token.exec(text))) {
    parent.append(document.createTextNode(text.slice(lastIndex, match.index)));
    if (match[1] === "!") {
      const imageUrl = safeUrl(match[3]);
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = match[2];
      image.loading = "lazy";
      parent.append(image);
      }
    } else if (match[2] !== undefined) {
      const href = safeUrl(
        match[3],
        `https://github.com/${repository.full_name}/blob/${repository.default_branch}/`
      );
      if (href) {
        const link = document.createElement("a");
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        addInlineContent(link, match[2], repository);
        parent.append(link);
      } else {
        parent.append(document.createTextNode(match[2]));
      }
    } else if (match[4] !== undefined) {
      const code = document.createElement("code");
      code.textContent = match[4];
      parent.append(code);
    } else {
      const element = document.createElement(
        match[5] !== undefined || match[6] !== undefined ? "strong" : "em"
      );
      element.textContent = match[5] ?? match[6] ?? match[7];
      parent.append(element);
    }
    lastIndex = token.lastIndex;
  }

  parent.append(document.createTextNode(text.slice(lastIndex)));
}

function renderReadme(
  container: HTMLElement,
  markdown: string,
  repository: Repository
) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  let index = 0;
  const renderCells = (row: string, element: HTMLTableRowElement, tag: "th" | "td") => {
    const cells = row
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|");
    for (const value of cells) {
      const cell = document.createElement(tag);
      addInlineContent(cell, value.trim(), repository);
      element.append(cell);
    }
  };

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index++;
      continue;
    }

    if (
      line.includes("|") &&
      index + 1 < lines.length &&
      /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(lines[index + 1])
    ) {
      const table = document.createElement("table");
      const head = document.createElement("thead");
      const header = document.createElement("tr");
      renderCells(line, header, "th");
      head.append(header);
      table.append(head);
      index += 2;

      const body = document.createElement("tbody");
      while (index < lines.length && lines[index].includes("|")) {
        const row = document.createElement("tr");
        renderCells(lines[index++], row, "td");
        body.append(row);
      }
      table.append(body);
      container.append(table);
      continue;
    }

    if (line.startsWith("```") || line.startsWith("~~~")) {
      const fence = line.slice(0, 3);
      const codeLines: string[] = [];
      index++;
      while (index < lines.length && !lines[index].startsWith(fence))
        codeLines.push(lines[index++]);
      index++;
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.textContent = codeLines.join("\n");
      pre.append(code);
      container.append(pre);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+?)\s*#*$/);
    if (heading) {
      const element = document.createElement(`h${heading[1].length}`);
      addInlineContent(element, heading[2], repository);
      container.append(element);
      index++;
      continue;
    }

    if (/^\s*(---+|___+|\*\*\*+)\s*$/.test(line)) {
      container.append(document.createElement("hr"));
      index++;
      continue;
    }

    if (/^\s*([-*+]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const list = document.createElement(ordered ? "ol" : "ul");
      while (index < lines.length && /^\s*([-*+]|\d+[.)])\s+/.test(lines[index])) {
        const item = document.createElement("li");
        addInlineContent(
          item,
          lines[index++].replace(/^\s*([-*+]|\d+[.)])\s+/, ""),
          repository
        );
        list.append(item);
      }
      container.append(list);
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote = document.createElement("blockquote");
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        const paragraph = document.createElement("p");
        addInlineContent(paragraph, lines[index++].replace(/^\s*>\s?/, ""), repository);
        quote.append(paragraph);
      }
      container.append(quote);
      continue;
    }

    const paragraphLines = [line];
    index++;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6}\s|```|~~~|\s*(---+|___+|\*\*\*+)\s*$|\s*([-*+]|\d+[.)])\s+|\s*>)/.test(
        lines[index]
      )
    ) {
      paragraphLines.push(lines[index++]);
    }
    const paragraph = document.createElement("p");
    addInlineContent(paragraph, paragraphLines.join(" "), repository);
    container.append(paragraph);
  }
}

function validHomepage(homepage: string | null) {
  if (!homepage) return "";
  const url = safeUrl(homepage);
  return url.startsWith("http://") || url.startsWith("https://") ? url : "";
}

type ProjectDetails = {
  image?: string;
  caseStudy?: string;
  readmePath?: string;
};

const projectDetails: Record<string, ProjectDetails> = {
  Trenz: {
    image: new URL("./img/trenz.png", import.meta.url).href,
    readmePath: "trenz/README.md",
  },
  shadow: {
    image: new URL("./img/shadow.png", import.meta.url).href,
  },
};

async function loadProjectPreview(article: HTMLElement, repository: Repository) {
  const image = article.querySelector<HTMLImageElement>(".project-preview img");
  if (!image || image.hasAttribute("src")) return;

  try {
    const markdown = await getReadme(repository, projectDetails[repository.name]?.readmePath);
    const firstImage = markdown.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (firstImage) {
      const imageUrl = safeUrl(firstImage[2]);
      if (imageUrl.startsWith("http")) {
        image.src = imageUrl;
        image.alt = firstImage[1] || `${repository.name} project preview`;
        article.classList.add("has-preview");
      }
    }
  } catch (error) {
    console.warn(`Unable to load preview for ${repository.full_name}`, error);
  }
}

function createProjectCard(repository: Repository) {
  const article = document.createElement("article");
  article.className = "project-card";

  const metadata = projectDetails[repository.name];
  const preview = document.createElement("figure");
  preview.className = "project-preview";
  const previewImage = document.createElement("img");
  previewImage.alt = `${repository.name} project preview`;
  previewImage.loading = "lazy";
  if (metadata?.image) {
    previewImage.src = metadata.image;
    article.classList.add("has-preview");
  }
  preview.append(previewImage);

  const header = document.createElement("header");
  const title = document.createElement("h2");
  title.textContent = repository.name.replace(/[-_]/g, " ");
  header.append(title);

  const summary = document.createElement("p");
  summary.className = "project-summary";
  summary.textContent = repository.description ?? "No repository description.";
  header.append(summary);

  const technologies = repository.topics;
  if (technologies.length) {
    const label = document.createElement("p");
    label.className = "project-tech-label";
    label.textContent = "Tech stack";
    const techStack = document.createElement("ul");
    techStack.className = "project-tech";
    for (const technology of technologies) {
      const tag = document.createElement("li");
      tag.textContent = technology;
      techStack.append(tag);
    }
    header.append(label, techStack);
  }

  const actions = document.createElement("div");
  actions.className = "project-actions";
  const homepage = validHomepage(repository.homepage);
  if (homepage) {
    const demoLink = document.createElement("a");
    demoLink.className = "btn";
    demoLink.href = homepage;
    demoLink.target = "_blank";
    demoLink.rel = "noopener noreferrer";
    demoLink.textContent = "Visit site";
    actions.append(demoLink);
  }

  const githubLink = document.createElement("a");
  githubLink.className = "btn";
  githubLink.href = repository.html_url;
  githubLink.target = "_blank";
  githubLink.rel = "noopener noreferrer";
  githubLink.textContent = "Code";
  actions.append(githubLink);

  const caseStudy = metadata?.caseStudy
    ? validHomepage(metadata.caseStudy)
    : "";
  if (caseStudy) {
    const caseStudyLink = document.createElement("a");
    caseStudyLink.className = "btn";
    caseStudyLink.href = caseStudy;
    caseStudyLink.target = "_blank";
    caseStudyLink.rel = "noopener noreferrer";
    caseStudyLink.textContent = "Case study";
    actions.append(caseStudyLink);
  }
  const detailsLink = document.createElement("a");
  detailsLink.className = "btn project-details-link";
  detailsLink.href = `/project.html?repo=${encodeURIComponent(repository.name)}`;
  detailsLink.textContent = "Project details";
  actions.append(detailsLink);
  header.append(actions);

  article.append(preview, header);
  return article;
}

export async function renderProjectDetail() {
  const status = document.querySelector<HTMLElement>(".project-page-status");
  const content = document.querySelector<HTMLElement>(".project-page-content");
  if (!status || !content) return;

  const repositoryName = new URLSearchParams(location.search).get("repo");
  if (!repositoryName) {
    status.textContent = "No project was selected.";
    return;
  }

  try {
    const repositories = await getRepositories();
    const repository = repositories.find(({ name }) => name === repositoryName);
    if (!repository) {
      status.textContent = "That public project could not be found.";
      return;
    }

    const metadata = projectDetails[repository.name];
    const title = repository.name.replace(/[-_]/g, " ");
    document.title = `${title} – Ayaan Ahamed F`;
    const header = content.querySelector<HTMLElement>(".project-detail-header");
    const image = content.querySelector<HTMLImageElement>(".project-detail-image");
    const description = content.querySelector<HTMLElement>(".project-detail-description");
    const stack = content.querySelector<HTMLElement>(".project-detail-stack");
    const actions = content.querySelector<HTMLElement>(".project-detail-actions");
    const readme = content.querySelector<HTMLElement>(".project-readme");
    if (!header || !image || !description || !stack || !actions || !readme) return;

    header.textContent = title;
    description.textContent = repository.description ?? "No repository description.";
    image.alt = `${title} project preview`;
    if (metadata?.image) image.src = metadata.image;

    const technologies = repository.topics;
    const stackLabel = document.querySelector<HTMLElement>(".project-detail-stack-label");
    if (technologies.length && stackLabel) stackLabel.hidden = false;
    for (const technology of technologies) {
      const tag = document.createElement("li");
      tag.textContent = technology;
      stack.append(tag);
    }

    const homepage = validHomepage(repository.homepage);
    if (homepage) {
      const siteLink = document.createElement("a");
      siteLink.className = "btn";
      siteLink.href = homepage;
      siteLink.target = "_blank";
      siteLink.rel = "noopener noreferrer";
      siteLink.textContent = "Visit site";
      actions.append(siteLink);
    }
    const codeLink = document.createElement("a");
    codeLink.className = "btn";
    codeLink.href = repository.html_url;
    codeLink.target = "_blank";
    codeLink.rel = "noopener noreferrer";
    codeLink.textContent = "Code";
    actions.append(codeLink);

    if (metadata?.caseStudy) {
      const caseStudy = validHomepage(metadata.caseStudy);
      if (caseStudy) {
        const caseStudyLink = document.createElement("a");
        caseStudyLink.className = "btn";
        caseStudyLink.href = caseStudy;
        caseStudyLink.target = "_blank";
        caseStudyLink.rel = "noopener noreferrer";
        caseStudyLink.textContent = "Case study";
        actions.append(caseStudyLink);
      }
    }

    try {
      const markdown = await getReadme(repository, metadata?.readmePath);
      renderReadme(readme, markdown, repository);
      const readmeImage = readme.querySelector<HTMLImageElement>("img");
      if (!image.hasAttribute("src") && readmeImage) image.src = readmeImage.src;
    } catch (error) {
      readme.textContent =
        error instanceof Error ? `README unavailable: ${error.message}` : "README unavailable.";
      readme.classList.add("project-error");
    }
    if (!image.hasAttribute("src")) image.closest("figure")?.remove();
    status.remove();
    content.hidden = false;
  } catch (error) {
    status.textContent =
      error instanceof Error
        ? `Project could not be loaded: ${error.message}`
        : "Project could not be loaded.";
    status.classList.add("project-error");
  }
}

export default async function renderProjects() {
  const section = document.querySelector<HTMLElement>(".projects-section");
  const container = section?.querySelector<HTMLElement>(".projects-list");
  const status = section?.querySelector<HTMLElement>(".projects-status");
  if (!container || !status) return;

  try {
    const repositories = await getRepositories();
    if (!repositories.length) {
      status.textContent = "No public projects found.";
      return;
    }

    status.remove();
    for (const repository of repositories) {
      const card = createProjectCard(repository);
      container.append(card);
      void loadProjectPreview(card, repository);
    }
  } catch (error) {
    status.textContent =
      error instanceof Error
        ? `Projects could not be loaded: ${error.message}`
        : "Projects could not be loaded.";
    status.classList.add("project-error");
  }
}
