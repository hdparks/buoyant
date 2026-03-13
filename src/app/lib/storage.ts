import { getDb, migrateFromJson } from "./db";

migrateFromJson();

export interface Image {
  id: string;
  name: string;
  url: string;
}

export interface UserRanking {
  userId: string;
  userName?: string;
  userImage?: string;
  comparisons: Comparison[];
  ranks?: string[];
  ratings: EloRating;
  updatedAt: string;
}

export interface EloRating {
  [imageId: string]: number;
}

export interface Collection {
  id: string;
  name: string;
  images: Image[];
  createdAt: string;
  rankings: Record<string, UserRanking>;
}

export interface Comparison {
  winnerId: string;
  loserId: string;
}

function loadCollectionWithDetails(collectionId: string): Collection | undefined {
  const db = getDb();

  const collection = db.prepare(
    "SELECT id, name, createdAt FROM collections WHERE id = ?"
  ).get(collectionId) as { id: string; name: string; createdAt: string } | undefined;

  if (!collection) return undefined;

  const images = db.prepare(
    "SELECT id, name, url FROM images WHERE collectionId = ?"
  ).all(collectionId) as Image[];

  const rankings: Record<string, UserRanking> = {};

  const rankingRows = db.prepare(
    "SELECT userId, userName, userImage, ranks, ratings, updatedAt FROM rankings WHERE collectionId = ?"
  ).all(collectionId) as {
    userId: string;
    userName: string | null;
    userImage: string | null;
    ranks: string;
    ratings: string;
    updatedAt: string;
  }[];

  for (const row of rankingRows) {
    const comparisons = db.prepare(
      "SELECT winnerId, loserId FROM comparisons WHERE rankingId = (SELECT id FROM rankings WHERE userId = ? AND collectionId = ? LIMIT 1)"
    ).all(row.userId, collectionId) as Comparison[];

    if (comparisons.length === 0) {
      const rankingId = db.prepare(
        "SELECT id FROM rankings WHERE userId = ? AND collectionId = ?"
      ).get(row.userId, collectionId) as { id: string } | undefined;
      
      if (rankingId) {
        const compRows = db.prepare(
          "SELECT winnerId, loserId FROM comparisons WHERE rankingId = ?"
        ).all(rankingId.id) as Comparison[];
        rankings[row.userId] = {
          userId: row.userId,
          userName: row.userName || undefined,
          userImage: row.userImage || undefined,
          comparisons: compRows,
          ranks: JSON.parse(row.ranks),
          ratings: JSON.parse(row.ratings),
          updatedAt: row.updatedAt,
        };
      }
    } else {
      rankings[row.userId] = {
        userId: row.userId,
        userName: row.userName || undefined,
        userImage: row.userImage || undefined,
        comparisons,
        ranks: JSON.parse(row.ranks),
        ratings: JSON.parse(row.ratings),
        updatedAt: row.updatedAt,
      };
    }
  }

  return {
    id: collection.id,
    name: collection.name,
    images,
    createdAt: collection.createdAt,
    rankings,
  };
}

export function getCollections(): Collection[] {
  const db = getDb();
  const rows = db.prepare("SELECT id FROM collections ORDER BY createdAt DESC").all() as { id: string }[];
  
  return rows.map(row => loadCollectionWithDetails(row.id)!).filter(Boolean);
}

export function getCollection(id: string): Collection | undefined {
  return loadCollectionWithDetails(id);
}

export function createCollection(name: string, images: Image[]): Collection {
  const db = getDb();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const insertCollection = db.prepare(
    "INSERT INTO collections (id, name, createdAt) VALUES (?, ?, ?)"
  );
  const insertImage = db.prepare(
    "INSERT INTO images (id, name, url, collectionId) VALUES (?, ?, ?, ?)"
  );

  const transaction = db.transaction(() => {
    insertCollection.run(id, name, createdAt);
    for (const image of images) {
      insertImage.run(image.id, image.name, image.url, id);
    }
  });

  transaction();

  return {
    id,
    name,
    images,
    createdAt,
    rankings: {},
  };
}

export function updateUserRanking(
  collectionId: string,
  userId: string,
  userName?: string,
  userImage?: string,
  comparisons?: Comparison[],
  ranks?: string[],
  ratings?: EloRating
): Collection | undefined {
  const db = getDb();
  const collection = getCollection(collectionId);
  if (!collection) return undefined;

  const existingRanking = collection.rankings[userId];
  const updatedAt = new Date().toISOString();

  const finalRanks = ranks ?? existingRanking?.ranks ?? [];
  const finalRatings = ratings ?? existingRanking?.ratings ?? {};
  const finalComparisons = comparisons ?? existingRanking?.comparisons ?? [];

  db.prepare(
    "INSERT OR REPLACE INTO users (id) VALUES (?)"
  ).run(userId);

  const existingRankingRow = db.prepare(
    "SELECT id FROM rankings WHERE userId = ? AND collectionId = ?"
  ).get(userId, collectionId) as { id: string } | undefined;

  if (existingRankingRow) {
    db.prepare(
      "DELETE FROM comparisons WHERE rankingId = ?"
    ).run(existingRankingRow.id);
  }

  const rankingId = existingRankingRow?.id ?? crypto.randomUUID();

  db.prepare(
    "INSERT OR REPLACE INTO rankings (id, userId, collectionId, userName, userImage, ranks, ratings, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    rankingId,
    userId,
    collectionId,
    userName ?? existingRanking?.userName ?? null,
    userImage ?? existingRanking?.userImage ?? null,
    JSON.stringify(finalRanks),
    JSON.stringify(finalRatings),
    updatedAt
  );

  const insertComparison = db.prepare(
    "INSERT INTO comparisons (id, rankingId, winnerId, loserId) VALUES (?, ?, ?, ?)"
  );

  for (const comp of finalComparisons) {
    insertComparison.run(crypto.randomUUID(), rankingId, comp.winnerId, comp.loserId);
  }

  return loadCollectionWithDetails(collectionId);
}

export function getUserRanking(collectionId: string, userId: string): UserRanking | undefined {
  const collection = getCollection(collectionId);
  return collection?.rankings?.[userId];
}

export async function saveImage(file: File): Promise<Image> {
  const path = await import("path");
  const { writeFile } = await import("fs/promises");

  const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
  
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name);
  const id = crypto.randomUUID();
  const filename = `${id}${ext}`;
  const filepath = path.join(UPLOADS_DIR, filename);

  await writeFile(filepath, buffer);

  return {
    id,
    name: file.name,
    url: `/uploads/${filename}`,
  };
}

export function deleteCollection(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM collections WHERE id = ?").run(id);
  return result.changes > 0;
}
