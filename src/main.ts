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

    const imageLinks = await page.$$eval(
      "img",
      (imgs, baseUrl) => {
        return imgs
          .map((img) => img.src)
          .filter(
            (src) =>
              (src.toLowerCase().includes(".jpg") ||
                src.toLowerCase().includes(".jpeg")) &&
              !src.includes("tgpthumbs"),
          )
          .map((src) => new URL(src, baseUrl).href);
      },
      request.loadedUrl,
    );

    for (const link of imageLinks) {
      console.log(link);
    }
  },
  maxRequestsPerCrawl: 100000,
  requestHandlerTimeoutSecs: 120,
  maxConcurrency: 10,
  navigationTimeoutSecs: 120,
  headless: true,
});

log.setLevel(LogLevel.INFO);
await crawler.run([startUrl]);
