import { NextRequest, NextResponse } from "next/server";
import { updateImage } from "@/app/lib/storage";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const { imageId } = await params;
  const body = await request.json();
  const { name, flavorText } = body;

  const success = updateImage(imageId, { name, flavorText });

  if (!success) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
