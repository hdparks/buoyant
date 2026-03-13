import { NextRequest, NextResponse } from "next/server";
import {
  getCollections,
  createCollection,
  Image,
} from "@/app/lib/storage";

export async function GET() {
  const collections = getCollections();
  return NextResponse.json(collections);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, images } = body;

    if (!name || !images || images.length < 2) {
      return NextResponse.json(
        { error: "Name and at least 2 images required" },
        { status: 400 }
      );
    }

    const collection = createCollection(name, images as Image[]);
    return NextResponse.json(collection, { status: 201 });
  } catch (error) {
    console.error("Error creating collection:", error);
    return NextResponse.json(
      { error: "Failed to create collection" },
      { status: 500 }
    );
  }
}
