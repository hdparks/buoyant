import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "buoyant.db");

const COLLECTION_NAMES = [
  "Best Sunsets",
  "Cat Photos",
  "Vacation Spots",
  "Street Photography",
  "Abstract Art",
  "Nature Landscapes",
  "Food Photography",
  "Architecture",
];

const USER_NAMES = [
  { name: "Alice Johnson", image: "https://i.pravatar.cc/150?u=alice" },
  { name: "Bob Smith", image: "https://i.pravatar.cc/150?u=bob" },
  { name: "Carol Williams", image: "https://i.pravatar.cc/150?u=carol" },
];

function getDb(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  initializeSchema(db);

  return db;
}

function initializeSchema(db: Database.Database) {
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

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      image TEXT
    );

    CREATE TABLE IF NOT EXISTS rankings (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      collectionId TEXT NOT NULL,
      userName TEXT,
      userImage TEXT,
      ranks TEXT DEFAULT '[]',
      ratings TEXT DEFAULT '{}',
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (collectionId) REFERENCES collections(id) ON DELETE CASCADE,
      UNIQUE(userId, collectionId)
    );

    CREATE TABLE IF NOT EXISTS comparisons (
      id TEXT PRIMARY KEY,
      rankingId TEXT NOT NULL,
      winnerId TEXT NOT NULL,
      loserId TEXT NOT NULL,
      FOREIGN KEY (rankingId) REFERENCES rankings(id) ON DELETE CASCADE
    );
  `);
}

function computeRanks(images: { id: string }[], comparisons: { winnerId: string; loserId: string }[]): string[] {
  const wins: Record<string, number> = {};
  for (const img of images) {
    wins[img.id] = 0;
  }

  for (const comp of comparisons) {
    wins[comp.winnerId]++;
  }

  const sorted = [...images].sort((a, b) => (wins[b.id] || 0) - (wins[a.id] || 0));
  return sorted.map(img => img.id);
}

function generateComparisons(imageIds: string[], numComparisons: number): { winnerId: string; loserId: string }[] {
  const comparisons: { winnerId: string; loserId: string }[] = [];
  const pairs = new Set<string>();

  const shuffled = [...imageIds].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffled.length - 1 && comparisons.length < numComparisons; i++) {
    for (let j = i + 1; j < shuffled.length && comparisons.length < numComparisons; j++) {
      const pairKey = `${shuffled[i]}-${shuffled[j]}`;
      if (!pairs.has(pairKey)) {
        pairs.add(pairKey);
        const winner = Math.random() > 0.5 ? shuffled[i] : shuffled[j];
        const loser = winner === shuffled[i] ? shuffled[j] : shuffled[i];
        comparisons.push({ winnerId: winner, loserId: loser });
      }
    }
  }

  return comparisons;
}

function generateTestData() {
  const db = getDb();

  const existingCollections = db.prepare("SELECT COUNT(*) as count FROM collections").get() as { count: number };
  if (existingCollections.count > 0) {
    console.log("Database already has data. Clear it first if you want to regenerate.");
    console.log("Run: rm data/buoyant.db*");
    return;
  }

  const insertCollection = db.prepare("INSERT INTO collections (id, name, createdAt) VALUES (?, ?, ?)");
  const insertImage = db.prepare("INSERT INTO images (id, name, url, collectionId) VALUES (?, ?, ?, ?)");
  const insertUser = db.prepare("INSERT OR IGNORE INTO users (id, name, image) VALUES (?, ?, ?)");
  const insertRanking = db.prepare("INSERT INTO rankings (id, userId, collectionId, userName, userImage, ranks, ratings, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  const insertComparison = db.prepare("INSERT INTO comparisons (id, rankingId, winnerId, loserId) VALUES (?, ?, ?, ?)");

  const users: { id: string; name: string; image: string }[] = [];
  for (const user of USER_NAMES) {
    const userId = crypto.randomUUID();
    users.push({ id: userId, name: user.name, image: user.image });
    insertUser.run(userId, user.name, user.image);
  }

  const numCollections = Math.floor(Math.random() * 3) + 3; // 3-5 collections
  const selectedNames = [...COLLECTION_NAMES].sort(() => Math.random() - 0.5).slice(0, numCollections);

  const transaction = db.transaction(() => {
    for (const name of selectedNames) {
      const collectionId = crypto.randomUUID();
      const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString();
      insertCollection.run(collectionId, name, createdAt);

      const numImages = Math.floor(Math.random() * 6) + 5; // 5-10 images
      const images: { id: string; name: string; url: string }[] = [];

      for (let i = 0; i < numImages; i++) {
        const imageId = crypto.randomUUID();
        const imageName = `Image ${i + 1}`;
        const imageUrl = `https://picsum.photos/seed/${imageId}/400/400`;
        images.push({ id: imageId, name: imageName, url: imageUrl });
        insertImage.run(imageId, imageName, imageUrl, collectionId);
      }

      const imageIds = images.map(img => img.id);
      const numComparisons = Math.floor(imageIds.length * 1.5);

      for (const user of users) {
        const rankingId = crypto.randomUUID();
        const comparisons = generateComparisons(imageIds, numComparisons);
        const ranks = computeRanks(images, comparisons);
        const ratings: Record<string, number> = {};
        for (const img of images) {
          ratings[img.id] = Math.random() * 10;
        }
        const updatedAt = new Date().toISOString();

        insertRanking.run(
          rankingId,
          user.id,
          collectionId,
          user.name,
          user.image,
          JSON.stringify(ranks),
          JSON.stringify(ratings),
          updatedAt
        );

        for (const comp of comparisons) {
          insertComparison.run(crypto.randomUUID(), rankingId, comp.winnerId, comp.loserId);
        }
      }

      console.log(`Created collection "${name}" with ${numImages} images and ${users.length} rankings`);
    }
  });

  transaction();
  console.log("\nTest data generation complete!");
}

generateTestData();
