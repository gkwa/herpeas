import { PlaywrightCrawler, LogLevel, log } from "crawlee";

interface LinkData {
  originalLink: string;
  parsedUrl: string;
}

const startUrl = process.env.START_URL || "https://crawlee.dev";

const crawler = new PlaywrightCrawler({
  async requestHandler({ request, page, log }) {
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
        };
      });
    });

    log.info(`Found ${links.length} matching links`);

    links.forEach((link, index) => {
      log.info(`${index + 1}. ${link.parsedUrl}`);
    });

    log.info(`Total links found: ${links.length}`);
  },
  maxRequestsPerCrawl: 1,
  headless: false,
  maxConcurrency: 1,
});

log.setLevel(LogLevel.INFO);
await crawler.run([startUrl]);
