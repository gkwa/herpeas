import fs from "fs/promises";
import crypto from "crypto";
import path from "path";
import { enhancedLog } from "./logging.js";
import { LinkData } from "../types.js";
import { outputDir } from "../config.js";

function hashUrl(url: string): string {
  return crypto.createHash("md5").update(url).digest("hex");
}

export async function saveLinksToFile(
  url: string,
  links: LinkData[],
): Promise<void> {
  const fileName = path.join(outputDir, `${hashUrl(url)}.json`);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(fileName, JSON.stringify(links, null, 2));
  enhancedLog(
    "info",
    `Links for ${url} written to ${fileName}. Total links: ${links.length}`,
  );
}

export async function hasBeenCrawled(url: string): Promise<boolean> {
  const fileName = path.join(outputDir, `${hashUrl(url)}.json`);
  return fs
    .access(fileName)
    .then(() => true)
    .catch(() => false);
}
