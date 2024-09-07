import { PlaywrightCrawler, LogLevel, log, Request } from "crawlee";
import { URL } from "url";

const startUrl = process.env.START_URL || "https://crawlee.dev";

const processedUrls = new Set<string>();

const crawler = new PlaywrightCrawler({
  async requestHandler({ request, page, enqueueLinks, log, pushData }) {
    const url = request.loadedUrl || request.url;
    if (processedUrls.has(url)) {
      log.info(`Skipping already processed URL: ${url}`);
      return;
    }
    processedUrls.add(url);

    const title = await page.title();
    log.info(`Processing: ${url} (Title: '${title}')`);
    await pushData({ title, url });

    // Check for and click the "show full size images" link
    try {
      const showFullSizeLink = await page.$('a:text("show full size images")');
      if (showFullSizeLink) {
        await showFullSizeLink.click();
        log.info('Clicked "show full size images" link');
        await page.waitForLoadState("networkidle");
      } else {
        log.info('No "show full size images" link found');
      }
    } catch (error) {
      log.error(`Error clicking "show full size images" link: ${error}`);
    }

    const imageLinks = await page.$$eval(
      "img",
      (imgs, baseUrl) => {
        return imgs
          .map((img) => img.src)
          .filter(
            (src) =>
              (src.toLowerCase().includes(".jpg") ||
                src.toLowerCase().includes(".jpeg")) &&
              !src.includes("tgpthumbs") &&
              !src.includes("linktrades.jpg"),
          )
          .map((src) => new URL(src, baseUrl).href);
      },
      url,
    );

    log.info(`Found ${imageLinks.length} image links on ${url}`);
    for (const link of imageLinks) {
      console.log(link);
    }

    await enqueueLinks({
      strategy: "same-domain",
      transformRequestFunction: (req) => {
        if (!processedUrls.has(req.url)) {
          log.info(`Enqueueing: ${req.url}`);
          return req;
        }
        return false;
      },
    });
  },
  maxRequestsPerCrawl: 10000,
  requestHandlerTimeoutSecs: 120,
  maxConcurrency: 5,
  navigationTimeoutSecs: 120,
  headless: false, // Set to false to see the browser for debugging
});

log.setLevel(LogLevel.INFO);

crawler.run([startUrl]).then(() => {
  log.info(`Processed ${processedUrls.size} unique URLs`);
});
