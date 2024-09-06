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

function getCallerInfo() {
  const error = {};
  Error.captureStackTrace(error);
  const stack = (error as any).stack.split("\n")[3];
  const match = stack.match(/at .+:(\d+):\d+/);
  return match ? `[Line ${match[1]}]` : "";
}

function enhancedLog(
  level: "info" | "error" | "debug",
  message: string,
  data?: Record<string, any>,
) {
  const callerInfo = getCallerInfo();
  if (data) {
    log[level](`${callerInfo} ${message}`, data);
  } else {
    log[level](`${callerInfo} ${message}`);
  }
}

function hashUrl(url: string): string {
  return crypto.createHash("md5").update(url).digest("hex");
}

async function saveLinksToFile(url: string, links: LinkData[]): Promise<void> {
  const fileName = path.join(outputDir, `${hashUrl(url)}.json`);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(fileName, JSON.stringify(links, null, 2));
  enhancedLog(
    "info",
    `Links for ${url} written to ${fileName}. Total links: ${links.length}`,
  );
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
      enhancedLog("info", `${url} has already been crawled. Skipping.`);
      return;
    }

    const title = await page.title();
    enhancedLog("info", `Title of ${url} is '${title}'`);

    // Wait for the dynamic content to be loaded
    try {
      await page.waitForFunction(
        () => {
          const controlsSection = document.getElementById("controls_section");
          return (
            controlsSection &&
            controlsSection.innerHTML.includes("show all images")
          );
        },
        { timeout: 10000 },
      );
      enhancedLog("info", "Dynamic content loaded successfully");
    } catch (error) {
      enhancedLog("error", "Timeout waiting for dynamic content:", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Click the "show all images" link to expand the list of links
    try {
      await page.evaluate(() => {
        const link = document.querySelector(
          'a[onclick*="show_full_size_images"]',
        );
        if (link) {
          (link as HTMLAnchorElement).click();
        } else {
          throw new Error("Link not found");
        }
      });
      enhancedLog("info", 'Clicked "show all images" link');
      // Wait for the new links to load
      await page.waitForLoadState("networkidle");
    } catch (error) {
      enhancedLog("error", 'Could not find or click "show all images" link:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const links: LinkData[] = await page.evaluate(() => {
      const linkElements = document.querySelectorAll('a[href*="go.php?ID="]');
      console.log(`Found ${linkElements.length} matching links`); // Debug log
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

    enhancedLog("info", `Found ${links.length} matching links on ${url}`);

    if (links.length === 0) {
      const content = await page.content();
      enhancedLog("error", "No links found. HTML content:", { content });
    } else {
      await saveLinksToFile(url, links);
    }

    // Update the main links.json file
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
      for (const link of links) {
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
        `Updated ${outputFile} - marked ${url} as visited and added ${links.length} new links`,
      );
    } catch (error) {
      enhancedLog("error", "Error updating main links file:", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
  maxRequestsPerCrawl: 1,
  headless: false, // Changed to false for debugging
  maxConcurrency: 1,
  navigationTimeoutSecs: 3 * 60,
  requestHandlerTimeoutSecs: 3 * 60,
});

log.setLevel(LogLevel.DEBUG); // Changed to DEBUG for more detailed logs

(async () => {
  try {
    const nextUrl = await getNextUnvisitedLink();
    if (nextUrl) {
      enhancedLog("info", `Crawling next unvisited link: ${nextUrl}`);
      await crawler.run([nextUrl]);
    } else {
      enhancedLog("info", "All links have been visited or crawled.");
    }
  } catch (error) {
    enhancedLog("error", "An error occurred:", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
})();
