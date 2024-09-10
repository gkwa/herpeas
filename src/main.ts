import { LogLevel, log } from "crawlee";
import { setupDatabase } from "./database.js";
import { createCrawler } from "./crawler.js";

const startUrls = process.env.START_URLS
  ? process.env.START_URLS.split(" ")
  : ["https://crawlee.dev"];

async function main() {
  await setupDatabase();

  const crawler = await createCrawler();

  log.setLevel(LogLevel.INFO);
  await crawler.run(startUrls);
}

main().catch(console.error);
