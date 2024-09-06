import { PlaywrightCrawler, LogLevel } from "crawlee";
import { enhancedLog } from "./utils/logging.js";
import {
  getNextUnvisitedLink,
} from "./utils/linkManagement.js";
import { handleRequest } from "./crawlerHandlers.js";

const crawler = new PlaywrightCrawler({
  async requestHandler({ request, page, log }) {
    await handleRequest({ request, page, log });
    await page.waitForTimeout(30000);
  },
  maxRequestsPerCrawl: 1,
  headless: false,
  maxConcurrency: 1,
  navigationTimeoutSecs: 3 * 60,
  requestHandlerTimeoutSecs: 3 * 60,
});

(async () => {
  try {
    const nextUrl = await getNextUnvisitedLink();
    if (nextUrl) {
      enhancedLog("info", `Crawling next unvisited link: ${nextUrl}`);
      await crawler.run([nextUrl]);
    } else {
      enhancedLog("info", "All links have been visited or crawled.");
    }
  } catch (error) {
    enhancedLog("error", "An error occurred:", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
})();
