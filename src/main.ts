import { PlaywrightCrawler, LogLevel, log } from "crawlee";

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
  },
  maxRequestsPerCrawl: 20,
});

log.setLevel(LogLevel.INFO);

await crawler.run([startUrl]);
