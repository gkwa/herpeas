import { PlaywrightCrawler } from "crawlee";
import { addLink } from "./database.js";

export async function createCrawler() {
  return new PlaywrightCrawler({
    async requestHandler({ request, page, log, enqueueLinks }) {
      console.log(`Visiting: ${request.url}`);
      const title = await page.title();
      log.info(`Title of "${request.url}" is '${title}'`);

      await addLink(request.url, title);

      await enqueueLinks({
        globs: ["**/*"],
        label: "detail",
      });
    },
    headless: true,
    maxRequestsPerCrawl: 9999,
    maxConcurrency: 20,
    navigationTimeoutSecs: 3 * 60,
    requestHandlerTimeoutSecs: 3 * 60,
  });
}
