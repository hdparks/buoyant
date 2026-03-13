import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { Image } from "@/app/lib/storage";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const uploadedImages: Image[] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = path.extname(file.name) || ".jpg";
      const id = crypto.randomUUID();
      const filename = `${id}${ext}`;
      const filepath = path.join(UPLOADS_DIR, filename);

      await mkdir(UPLOADS_DIR, { recursive: true });
      await writeFile(filepath, buffer);

      uploadedImages.push({
        id,
        name: file.name,
        url: `/uploads/${filename}`,
      });
    }

    return NextResponse.json(uploadedImages);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
