import { PlaywrightCrawler, LogLevel, log, RequestQueue } from "crawlee";

const startUrl = process.env.START_URL || "https://crawlee.dev";

const requestQueue = await RequestQueue.open();
await requestQueue.addRequest({ url: startUrl });

const crawler = new PlaywrightCrawler({
  requestQueue,
  async requestHandler({ request, page, log, pushData }) {
    console.log(`Visiting: ${request.url}`);

    const title = await page.title();
    log.info(`Title of "${request.url}" is '${title}'`);
    await pushData({ title, url: request.url });

    const links = await page.$$eval("a", (elements) =>
      elements.map((el) => el.href),
    );
    for (const link of links) {
        log.info(`Enqueueing: ${link}`);
        await requestQueue.addRequest({ url: link });
    }
  },
  maxRequestsPerCrawl: 20,
  headless: true,
});

log.setLevel(LogLevel.INFO);

await crawler.run();
