import { CheerioCrawler, LogLevel, log, RequestQueue } from "crawlee";
import { createHash } from "crypto";
import fs from "fs/promises";
import path from "path";

const startUrl = process.env.START_URL || "https://crawlee.dev";
const cacheDir = "./cache";

async function md5(str: string): Promise<string> {
  return createHash("md5").update(str).digest("hex");
}

async function cacheExists(url: string): Promise<boolean> {
  const hash = await md5(url);
  const cachePath = path.join(cacheDir, `${hash}.html`);
  try {
    await fs.access(cachePath);
    return true;
  } catch {
    return false;
  }
}

async function saveToCache(url: string, content: string): Promise<void> {
  const hash = await md5(url);
  const cachePath = path.join(cacheDir, `${hash}.html`);
  await fs.writeFile(cachePath, content);
}

async function loadFromCache(url: string): Promise<string> {
  const hash = await md5(url);
  const cachePath = path.join(cacheDir, `${hash}.html`);
  return fs.readFile(cachePath, "utf-8");
}

const crawler = new CheerioCrawler({
  async requestHandler({ $, request, enqueueLinks, log, pushData }) {
    const url = request.loadedUrl!;
    let content: string;

    if (await cacheExists(url)) {
      content = await loadFromCache(url);
      log.info(`Loaded from cache: ${url}`);
    } else {
      content = $.html();
      await saveToCache(url, content);
      log.info(`Fetched and cached: ${url}`);
    }

    const title = $("title").text();
    log.info(`Title of ${url} is '${title}'`);
    await pushData({ title, url });

    await enqueueLinks({
      selector: 'a[href*="go.php?ID="]',
      transformRequestFunction: (req) => {
        log.info(`Enqueueing: ${req.url}`);
        return req;
      },
    });
  },
  maxRequestsPerCrawl: 100,
  requestQueue: await RequestQueue.open(),
  requestHandlerTimeoutSecs: 60,
  maxConcurrency: 10,
  navigationTimeoutSecs: 60,
});

async function main() {
  await fs.mkdir(cacheDir, { recursive: true });
  log.setLevel(LogLevel.INFO);
  await crawler.run([startUrl]);
}

main();
