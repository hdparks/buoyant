"use client";

import { Image } from "@/app/lib/storage";

interface ComparisonCardProps {
  imageA: Image;
  imageB: Image;
  onVote: (winnerId: string, loserId: string) => void;
}

export default function ComparisonCard({
  imageA,
  imageB,
  onVote,
}: ComparisonCardProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300">
        Which do you prefer?
      </h2>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-4xl">
        <button
          onClick={() => onVote(imageA.id, imageB.id)}
          className="flex-1 group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-4 border-transparent hover:border-blue-500 transition-all"
        >
          <img
            src={imageA.url}
            alt={imageA.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-opacity">
              I prefer this
            </span>
          </div>
        </button>

        <div className="flex items-center justify-center">
          <span className="text-gray-400 dark:text-gray-500 font-medium">VS</span>
        </div>

        <button
          onClick={() => onVote(imageB.id, imageA.id)}
          className="flex-1 group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-4 border-transparent hover:border-blue-500 transition-all"
        >
          <img
            src={imageB.url}
            alt={imageB.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-opacity">
              I prefer this
            </span>
          </div>
        </button>
      </div>

      <p className="text-sm text-gray-400 dark:text-gray-500">Click on your preferred image</p>
    </div>
  );
}
