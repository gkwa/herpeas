import { CheerioCrawler, LogLevel, log } from "crawlee";

const startUrl = process.env.START_URL || "https://crawlee.dev";

const crawler = new CheerioCrawler({
  async requestHandler({ $, request, enqueueLinks, log, pushData }) {
    const title = $("title").text();
    log.info(`Title of ${request.loadedUrl} is '${title}'`);
    await pushData({ title, url: request.loadedUrl });
    await enqueueLinks({
      selector: 'a[href*="go.php?ID="]',
      transformRequestFunction: (req) => {
        log.info(`Enqueueing: ${req.url}`);
        return req;
      },
    });
  },
  maxRequestsPerCrawl: 5,
});

log.setLevel(LogLevel.INFO);
await crawler.run([startUrl]);
