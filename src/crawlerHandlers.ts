import { Page } from "playwright";
import { Log, Request as CrawleeRequest } from "crawlee";
import { enhancedLog } from "./utils/logging.js";
import { saveLinksToFile } from "./utils/fileOperations.js";
import { updateMainLinksFile } from "./utils/linkManagement.js";
import { LinkData } from "./types.js";
import { hasBeenCrawled } from "./utils/fileOperations.js";

export async function handleRequest({
 request,
 page,
}: {
 request: CrawleeRequest;
 page: Page;
 log: Log;
}) {
 const url = request.url;
 if (await hasBeenCrawled(url)) {
   enhancedLog("info", `${url} has already been crawled. Skipping.`);
   return;
 }

 const title = await page.title();
 enhancedLog("info", `Title of ${url} is '${title}'`);

 await handleDynamicContent(page);
 const links = await extractLinks(page, url);

 enhancedLog("info", `Found ${links.length} matching links on ${url}`);

 if (links.length === 0) {
   const content = await page.content();
   console.log(content)
 } else {
   await saveLinksToFile(url, links);
 }

 await updateMainLinksFile(url, links);
}

async function handleDynamicContent(page: Page) {
 try {
   await page.waitForFunction(
     () => {
       const controlsSection = document.getElementById("controls_section");
       return (
         controlsSection &&
         controlsSection.innerHTML.includes("show all images")
       );
     },
     { timeout: 10000 },
   );
   enhancedLog("info", "Dynamic content loaded successfully");

   await page.evaluate(() => {
     const link = document.querySelector(
       'a[onclick*="show_full_size_images"]',
     );
     if (link) {
       (link as HTMLAnchorElement).click();
     } else {
       throw new Error("Link not found");
     }
   });
   enhancedLog("info", 'Clicked "show all images" link');
   await page.waitForLoadState("networkidle");
 } catch (error) {
   enhancedLog("error", "Error handling dynamic content:", {
     error: error instanceof Error ? error.message : String(error),
   });
 }
}

async function extractLinks(page: Page, baseUrl: string): Promise<LinkData[]> {
 const initialLinks = await page.evaluate((baseUrl) => {
   const linkElements = document.querySelectorAll('a[href*="go.php?ID="]');
   return Array.from(linkElements).map((el) => {
     const href = el.getAttribute("href");
     const match = href?.match(/go\.php\?ID=\d+&URL=(.+)/);
     const parsedUrl = match ? decodeURIComponent(match[1]) : "";
     return {
       originalLink: new URL(href || "", baseUrl).href,
       parsedUrl: parsedUrl ? new URL(parsedUrl, baseUrl).href : "",
       visited: false,
     };
   });
 }, baseUrl);

 if (initialLinks.length > 0) {
   return initialLinks;
 }

 return page.evaluate((baseUrl) => {
   const linkElements = document.querySelectorAll('a');
   return Array.from(linkElements).map((el) => {
     const href = el.getAttribute("href");
     return {
       originalLink: new URL(href || "", baseUrl).href,
       parsedUrl: new URL(href || "", baseUrl).href,
       visited: false,
     };
   });
 }, baseUrl);
}
