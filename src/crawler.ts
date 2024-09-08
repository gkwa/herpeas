import { PlaywrightCrawler, RequestQueue } from "crawlee";
import { addLink } from "./database.js";

export async function createCrawler(requestQueue: RequestQueue) {
  return new PlaywrightCrawler({
    requestQueue,
    async requestHandler({ request, page, log, pushData }) {
      console.log(`Visiting: ${request.url}`);
      const title = await page.title();
      log.info(`Title of "${request.url}" is '${title}'`);

      await addLink(request.url, title);
      await pushData({ title, url: request.url });

      const links = await page.$$eval("a", (elements) =>
        elements.map((el) => el.href),
      );
      for (const link of links) {
        log.info(`Enqueueing: ${link}`);
        await requestQueue.addRequest({ url: link });
        await addLink(link, "");
      }
    },
    headless: true,
    maxRequestsPerCrawl: 10,
    maxConcurrency: 1,
    navigationTimeoutSecs: 3 * 60,
    requestHandlerTimeoutSecs: 3 * 60,
  });
}
