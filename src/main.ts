import { LogLevel, log } from "crawlee";
import { setupDatabase } from "./database.js";
import { createCrawler } from "./crawler.js";

const startUrls = process.env.START_URLS
  ? process.env.START_URLS.split(" ")
  : ["https://crawlee.dev"];

async function main() {
  // Log the list of URLs we'll be visiting
  console.log("Starting crawl with the following URLs:");
  startUrls.forEach((url, index) => {
    console.log(`${index + 1}. ${url}`);
  });
  console.log(""); // Add a blank line for better readability

  await setupDatabase();

  const crawler = await createCrawler();

  log.setLevel(LogLevel.INFO);
  await crawler.run(startUrls);
}

main().catch(console.error);
