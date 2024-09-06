import { PlaywrightCrawler, LogLevel, log } from "crawlee";
import fs from "fs/promises";

interface LinkData {
  originalLink: string;
  parsedUrl: string;
  visited: boolean;
}

const startUrl = process.env.START_URL || "https://crawlee.dev";
const outputFile = "links.json";

const crawler = new PlaywrightCrawler({
  async requestHandler({ request, page, log }) {
    try {
      const linksFileExists = await fs
        .access(outputFile)
        .then(() => true)
        .catch(() => false);

      if (linksFileExists) {
        log.info(`${outputFile} already exists. Skipping crawl.`);
        return;
      }

      const title = await page.title();
      log.info(`Title of ${request.loadedUrl} is '${title}'`);

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

      log.info(`Found ${links.length} matching links`);
      links.forEach((link, index) => {
        log.info(`${index + 1}. ${link.parsedUrl}`);
      });
      log.info(`Total links found: ${links.length}`);

      await fs.writeFile(outputFile, JSON.stringify(links, null, 2));
      log.info(`Links written to ${outputFile}`);
    } catch (error) {
      log.error("An error occurred:", {
        error: error instanceof Error ? error.message : String(error),
      });
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
  const linksFileExists = await fs
    .access(outputFile)
    .then(() => true)
    .catch(() => false);

  if (!linksFileExists) {
    await crawler.run([startUrl]);
  } else {
    log.info(`${outputFile} already exists. Skipping crawl.`);
  }
})();
