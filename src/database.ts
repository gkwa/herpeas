import sqlite3 from "sqlite3";
import { open } from "sqlite";

export async function openDatabase() {
  return open({
    filename: "./links.sqlite",
    driver: sqlite3.Database,
  });
}

export async function setupDatabase() {
  const db = await openDatabase();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.close();
}

export async function insertLink(url: string, title: string) {
  const db = await openDatabase();
  await db.run("INSERT OR IGNORE INTO links (url, title) VALUES (?, ?)", [
    url,
    title,
  ]);
  await db.close();
}
