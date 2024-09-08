import { LogLevel, log, RequestQueue } from "crawlee";
import { setupDatabase } from "./database.js";
import { createCrawler } from "./crawler.js";
import { parseArguments } from "./cli.js";

async function main() {
  const { startUrl, domains } = parseArguments();

  await setupDatabase();
  const requestQueue = await RequestQueue.open();
  await requestQueue.addRequest({ url: startUrl });

  const crawler = await createCrawler(requestQueue, domains);

  log.setLevel(LogLevel.INFO);
  await crawler.run();
}

main().catch(console.error);
