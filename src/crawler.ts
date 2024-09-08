import { PlaywrightCrawler, RequestQueue } from "crawlee";
import { insertLink } from "./database.js";

export function createCrawler(
  requestQueue: RequestQueue,
  allowedDomains?: string[],
) {
  return new PlaywrightCrawler({
    requestQueue,
    async requestHandler({ request, page, enqueueLinks, log }) {
      const title = await page.title();
      log.info(`Title of ${request.url}: ${title}`);
      await insertLink(request.url, title);

      await enqueueLinks({
        globs: allowedDomains
          ? allowedDomains.flatMap((domain) => [
              `http://${domain}/**`,
              `https://${domain}/**`,
            ])
          : undefined,
        transformRequestFunction(req) {
          if (
            allowedDomains &&
            !allowedDomains.some((domain) => req.url.includes(domain))
          ) {
            return false;
          }
          return req;
        },
      });
    },
  });
}
