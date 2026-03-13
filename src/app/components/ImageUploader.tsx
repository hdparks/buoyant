"use client";

import { useState, useCallback } from "react";
import { Upload, X, Edit2 } from "lucide-react";
import { Image } from "@/app/lib/storage";

interface ImageUploaderProps {
  onImagesChange: (images: Image[]) => void;
}

interface ImageWithMeta extends Image {
  pendingName: string;
  pendingFlavorText: string;
}

export default function ImageUploader({ onImagesChange }: ImageUploaderProps) {
  const [images, setImages] = useState<ImageWithMeta[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList) => {
      const imageFiles = Array.from(files).filter((file) =>
        file.type.startsWith("image/")
      );

      if (imageFiles.length === 0) return;

      setUploading(true);

      try {
        const formData = new FormData();
        imageFiles.forEach((file) => formData.append("files", file));

        const response = await fetch("/api/collections/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Upload failed");
        }

        const uploadedImages: Image[] = await response.json();
        const newImages: ImageWithMeta[] = uploadedImages.map((img) => ({
          ...img,
          pendingName: img.name.replace(/\.[^/.]+$/, ""),
          pendingFlavorText: img.flavorText || "",
        }));
        const allImages = [...images, ...newImages];
        setImages(allImages);
        onImagesChange(
          allImages.map((img) => ({
            id: img.id,
            name: img.pendingName,
            url: img.url,
            flavorText: img.pendingFlavorText || undefined,
          }))
        );
      } catch (error) {
        console.error("Error uploading images:", error);
      } finally {
        setUploading(false);
      }
    },
    [images, onImagesChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const removeImage = (id: string) => {
    const newImages = images.filter((img) => img.id !== id);
    setImages(newImages);
    onImagesChange(
      newImages.map((img) => ({
        id: img.id,
        name: img.pendingName,
        url: img.url,
        flavorText: img.pendingFlavorText || undefined,
      }))
    );
  };

  const updateImageMeta = (id: string, field: "pendingName" | "pendingFlavorText", value: string) => {
    const newImages = images.map((img) =>
      img.id === id ? { ...img, [field]: value } : img
    );
    setImages(newImages);
    onImagesChange(
      newImages.map((img) => ({
        id: img.id,
        name: img.pendingName,
        url: img.url,
        flavorText: img.pendingFlavorText || undefined,
      }))
    );
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          id="image-upload"
          disabled={uploading}
        />
        <label
          htmlFor="image-upload"
          className="cursor-pointer flex flex-col items-center gap-2"
        >
          {uploading ? (
            <>
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-600 dark:text-gray-300">Uploading...</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-300">
                Drag and drop images here, or click to select
              </p>
              <p className="text-sm text-gray-400">Supports multiple images</p>
            </>
          )}
        </label>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700"
            >
              <img
                src={image.url}
                alt={image.pendingName}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setEditingId(editingId === image.id ? null : image.id)}
                className="absolute top-2 right-2 p-1 bg-blue-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => removeImage(image.id)}
                className="absolute top-2 left-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
              {editingId === image.id ? (
                <div className="absolute inset-0 bg-black/80 p-2 flex flex-col gap-1">
                  <input
                    type="text"
                    value={image.pendingName}
                    onChange={(e) => updateImageMeta(image.id, "pendingName", e.target.value)}
                    placeholder="Image name"
                    className="text-xs px-1 py-0.5 rounded bg-white text-gray-900 w-full"
                  />
                  <textarea
                    value={image.pendingFlavorText}
                    onChange={(e) => updateImageMeta(image.id, "pendingFlavorText", e.target.value)}
                    placeholder="Flavor text (optional)"
                    className="text-xs px-1 py-0.5 rounded bg-white text-gray-900 w-full flex-1 resize-none"
                  />
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs bg-blue-500 text-white rounded py-0.5"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                  {image.pendingName}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && images.length < 2 && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Add at least 2 images to create a collection
        </p>
      )}
    </div>
  );
}
