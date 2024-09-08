import { LogLevel, log, RequestQueue } from "crawlee";
import { setupDatabase } from "./database.js";
import { createCrawler } from "./crawler.js";

const startUrl = process.env.START_URL || "https://crawlee.dev";

async function main() {
  await setupDatabase();

  const requestQueue = await RequestQueue.open();
  await requestQueue.addRequest({ url: startUrl });

  const crawler = await createCrawler(requestQueue);

  log.setLevel(LogLevel.INFO);
  await crawler.run();
}

main().catch(console.error);
