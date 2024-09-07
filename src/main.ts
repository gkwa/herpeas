import { PlaywrightCrawler, LogLevel, log } from "crawlee";
import { URL } from "url";

const startUrl = process.env.START_URL || "https://crawlee.dev";

const crawler = new PlaywrightCrawler({
  async requestHandler({ request, page, enqueueLinks, log, pushData }) {
    const title = await page.title();
    log.info(`Title of ${request.loadedUrl} is '${title}'`);
    await pushData({ title, url: request.loadedUrl });

    await enqueueLinks({
      strategy: "same-domain",
      transformRequestFunction: (req) => {
        log.info(`Enqueueing: ${req.url}`);
        return req;
      },
    });

    // Check for and click the "show full size images" link
    try {
      await page.click('a:text("show full size images")', { timeout: 5000 });
      log.info('Clicked "show full size images" link');
      // Wait for the page to load after clicking
      await page.waitForLoadState("networkidle");
    } catch (error) {
      log.info('No "show full size images" link found or unable to click');
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
              !src.includes("tgpthumbs") && !src.includes("linktrades.jpg"),
          )
          .map((src) => new URL(src, baseUrl).href);
      },
      request.loadedUrl,
    );

    for (const link of imageLinks) {
      console.log(link);
    }
  },
  maxRequestsPerCrawl: 10000,
  requestHandlerTimeoutSecs: 120,
  maxConcurrency: 5,
  navigationTimeoutSecs: 120,
  headless: true,
});

log.setLevel(LogLevel.INFO);
await crawler.run([startUrl]);
