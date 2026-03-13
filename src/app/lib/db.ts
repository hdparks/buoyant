import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "buoyant.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  initializeSchema();

  return db;
}

function initializeSchema() {
  if (!db) return;

  db.exec(`
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      collectionId TEXT NOT NULL,
      FOREIGN KEY (collectionId) REFERENCES collections(id) ON DELETE CASCADE
    );
  `);

  try {
    db.exec(`ALTER TABLE images ADD COLUMN flavorText TEXT`);
  } catch (e: unknown) {
    if (e instanceof Error && !e.message.includes("duplicate column name")) {
      throw e;
    }
  }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

interface LegacyCollection {
  id: string;
  name: string;
  images: { id: string; name: string; url: string }[];
  createdAt: string;
  rankings: Record<string, {
    userId: string;
    userName?: string;
    userImage?: string;
    comparisons: { winnerId: string; loserId: string }[];
    ranks?: string[];
    ratings: Record<string, number>;
    updatedAt: string;
  }>;
}

function hasData(): boolean {
  if (!db) return false;
  const result = db.prepare("SELECT COUNT(*) as count FROM collections").get() as { count: number };
  return result.count > 0;
}

export function migrateFromJson() {
  getDb();
  
  const jsonPath = path.join(DATA_DIR, "collections.json");
  if (!fs.existsSync(jsonPath) || hasData()) return;

  const data = fs.readFileSync(jsonPath, "utf-8");
  const collections: LegacyCollection[] = JSON.parse(data);

  const insertCollection = db!.prepare(
    "INSERT INTO collections (id, name, createdAt) VALUES (?, ?, ?)"
  );
  const insertImage = db!.prepare(
    "INSERT INTO images (id, name, url, collectionId) VALUES (?, ?, ?, ?)"
  );
  const insertUser = db!.prepare(
    "INSERT OR IGNORE INTO users (id) VALUES (?)"
  );
  const insertRanking = db!.prepare(
    "INSERT INTO rankings (id, userId, collectionId, userName, userImage, ranks, ratings, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertComparison = db!.prepare(
    "INSERT INTO comparisons (id, rankingId, winnerId, loserId) VALUES (?, ?, ?, ?)"
  );

  const transaction = db!.transaction(() => {
    for (const collection of collections) {
      insertCollection.run(collection.id, collection.name, collection.createdAt);

      for (const image of collection.images) {
        insertImage.run(image.id, image.name, image.url, collection.id);
      }

      for (const [userId, ranking] of Object.entries(collection.rankings || {})) {
        insertUser.run(userId);

        const rankingId = crypto.randomUUID();
        insertRanking.run(
          rankingId,
          userId,
          collection.id,
          ranking.userName || null,
          ranking.userImage || null,
          JSON.stringify(ranking.ranks || []),
          JSON.stringify(ranking.ratings || {}),
          ranking.updatedAt
        );

        for (const comparison of ranking.comparisons || []) {
          insertComparison.run(
            crypto.randomUUID(),
            rankingId,
            comparison.winnerId,
            comparison.loserId
          );
        }
      }
    }
  });

  transaction();
}
