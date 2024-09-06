import { PlaywrightCrawler, LogLevel, log } from "crawlee";
import fs from "fs/promises";
import crypto from "crypto";
import path from "path";

interface LinkData {
  originalLink: string;
  parsedUrl: string;
  visited: boolean;
}

const startUrl = process.env.START_URL || "https://crawlee.dev";
const outputFile = "links.json";
const outputDir = "crawled_pages";

function hashUrl(url: string): string {
  return crypto.createHash("md5").update(url).digest("hex");
}

async function saveLinksToFile(url: string, links: LinkData[]): Promise<void> {
  const fileName = path.join(outputDir, `${hashUrl(url)}.json`);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(fileName, JSON.stringify(links, null, 2));
  log.info(`Links for ${url} written to ${fileName}`);
}

async function hasBeenCrawled(url: string): Promise<boolean> {
  const fileName = path.join(outputDir, `${hashUrl(url)}.json`);
  return fs
    .access(fileName)
    .then(() => true)
    .catch(() => false);
}

async function getNextUnvisitedLink(): Promise<string | null> {
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

const crawler = new PlaywrightCrawler({
  async requestHandler({ request, page, log }) {
    const url = request.loadedUrl || request.url;
    if (await hasBeenCrawled(url)) {
      log.info(`${url} has already been crawled. Skipping.`);
      return;
    }

    const title = await page.title();
    log.info(`Title of ${url} is '${title}'`);

    const links: LinkData[] = await page.evaluate(() => {
      const linkElements = document.querySelectorAll('a[href*="go.php?ID="]');
      return Array.from(linkElements).map((el) => {
        const href = el.getAttribute("href");
        const match = href?.match(/go\.php\?ID=\d+&URL=(.+)/);
        return {
          originalLink: href || "",
          parsedUrl: match ? decodeURIComponent(match[1]) : "",
          visited: false,
        };
      });
    });

    log.info(`Found ${links.length} matching links on ${url}`);
    await saveLinksToFile(url, links);

    const mainLinks: LinkData[] = JSON.parse(
      await fs.readFile(outputFile, "utf-8"),
    );
    const currentLink = mainLinks.find((link) => link.parsedUrl === url);
    if (currentLink) {
      currentLink.visited = true;
      await fs.writeFile(outputFile, JSON.stringify(mainLinks, null, 2));
      log.info(`Updated ${outputFile} - marked ${url} as visited`);
    }
  },
  maxRequestsPerCrawl: 1,
  headless: true,
  maxConcurrency: 1,
  navigationTimeoutSecs: 3 * 60,
  requestHandlerTimeoutSecs: 3 * 60,
});

log.setLevel(LogLevel.INFO);

(async () => {
  try {
    const nextUrl = await getNextUnvisitedLink();
    if (nextUrl) {
      log.info(`Crawling next unvisited link: ${nextUrl}`);
      await crawler.run([nextUrl]);
    } else {
      log.info("All links have been visited or crawled.");
    }
  } catch (error) {
    log.error("An error occurred:", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
})();
