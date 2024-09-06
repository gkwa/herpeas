import fs from "fs/promises";
import { enhancedLog } from "./logging.js";
import { LinkData } from "../types.js";
import { outputFile, startUrl } from "../config.js";
import { hasBeenCrawled } from "./fileOperations.js";

export async function getNextUnvisitedLink(): Promise<string | null> {
  const linksFileExists = await fs
    .access(outputFile)
    .then(() => true)
    .catch(() => false);
  if (!linksFileExists) return startUrl;

  const links: LinkData[] = JSON.parse(await fs.readFile(outputFile, "utf-8"));
  for (const link of links) {
    if (!link.visited && !(await hasBeenCrawled(link.parsedUrl))) {
      return link.parsedUrl;
    }
  }
  return null;
}

export async function updateMainLinksFile(
  url: string,
  newLinks: LinkData[],
): Promise<void> {
  try {
    const mainLinksExist = await fs
      .access(outputFile)
      .then(() => true)
      .catch(() => false);
    let mainLinks: LinkData[] = mainLinksExist
      ? JSON.parse(await fs.readFile(outputFile, "utf-8"))
      : [];

    const currentLink = mainLinks.find((link) => link.parsedUrl === url);
    if (currentLink) {
      currentLink.visited = true;
    } else {
      mainLinks.push({ originalLink: url, parsedUrl: url, visited: true });
    }

    // Add new links if they don't exist in mainLinks
    for (const link of newLinks) {
      if (
        !mainLinks.some(
          (existingLink) => existingLink.parsedUrl === link.parsedUrl,
        )
      ) {
        mainLinks.push(link);
      }
    }

    await fs.writeFile(outputFile, JSON.stringify(mainLinks, null, 2));
    enhancedLog(
      "info",
      `Updated ${outputFile} - marked ${url} as visited and added ${newLinks.length} new links`,
    );
  } catch (error) {
    enhancedLog("error", "Error updating main links file:", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
