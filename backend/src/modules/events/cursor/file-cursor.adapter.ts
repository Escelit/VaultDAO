import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { CursorStorage, EventCursor } from "./cursor.types.js";

/**
 * FileCursorAdapter
 * 
 * Stores event polling cursor in a local JSON file for persistence across restarts.
 */
export class FileCursorAdapter implements CursorStorage {
  private readonly filePath: string;

  constructor(baseDir: string = "./") {
    this.filePath = join(baseDir, ".event-cursor.json");
  }

  /**
   * Retrieves the cursor from disk.
   */
  public async getCursor(): Promise<EventCursor | null> {
    if (!existsSync(this.filePath)) {
      console.debug(`[file-cursor] no cursor file found at ${this.filePath}`);
      return null;
    }

    const content = readFileSync(this.filePath, "utf8");

    try {
      return JSON.parse(content) as EventCursor;
    } catch (error) {
      console.warn(`[file-cursor] corrupt cursor JSON in ${this.filePath}, backing up and starting fresh`, error);

      const backupPath = `${this.filePath}.corrupt.${Date.now()}`;
      try {
        writeFileSync(backupPath, content, "utf8");
        console.warn(`[file-cursor] backed up corrupt cursor file to ${backupPath}`);
      } catch (backupError) {
        console.error(`[file-cursor] failed to backup corrupt cursor file ${this.filePath}:`, backupError);
      }

      return null;
    }
  }

  /**
   * Saves the cursor to disk.
   */
  public async saveCursor(cursor: EventCursor): Promise<void> {
    try {
      const content = JSON.stringify(cursor, null, 2);
      writeFileSync(this.filePath, content, "utf8");
    } catch (error) {
      console.error(`[file-cursor] failed to persist cursor to ${this.filePath}:`, error);
      throw error;
    }
  }
}
