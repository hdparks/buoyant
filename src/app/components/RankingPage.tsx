"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { ArrowLeft, Trophy, Save, Users, Image as ImageIcon } from "lucide-react";
import { Collection, Image, Comparison, EloRating } from "@/app/lib/storage";
import ComparisonCard from "@/app/components/ComparisonCard";
import Avatar from "./Avatar";
import { useToast } from "./Toast";
import { PageSpinner } from "./Spinner";

interface RankingPageProps {
  collection: Collection;
}

const INITIAL_ELO = 1200;
const K_FACTOR = 32;

function calculateElo(
  winnerRating: number,
  loserRating: number
): { winnerNew: number; loserNew: number } {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

  return {
    winnerNew: Math.round(winnerRating + K_FACTOR * (1 - expectedWinner)),
    loserNew: Math.round(loserRating + K_FACTOR * (0 - expectedLoser)),
  };
}

function applyComparisons(images: Image[], comparisons: Comparison[]): Image[] {
  const sorted = [...images];
  for (const comp of comparisons) {
    const idx = sorted.findIndex(img => img.id === comp.winnerId);
    const nextIdx = sorted.findIndex(img => img.id === comp.loserId);
    if (idx !== -1 && nextIdx !== -1 && idx > nextIdx) {
      sorted.splice(nextIdx, 2, sorted[idx], sorted[nextIdx]);
    }
  }
  return sorted;
}

export default function RankingPage({ collection }: RankingPageProps) {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [ratings, setRatings] = useState<EloRating>({});
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [sortedImages, setSortedImages] = useState<Image[]>(collection.images);
  const [pairIndex, setPairIndex] = useState(0);
  const [passNumber, setPassNumber] = useState(1);
  const [swapsThisPass, setSwapsThisPass] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [saving, setSaving] = useState(false);

  const userId = session?.user?.id || "anonymous";
  const userName = session?.user?.name || "Anonymous";
  const userImage = session?.user?.image;

  useEffect(() => {
    const userRanking = collection.rankings?.[userId];
    if (userRanking?.comparisons) {
      setComparisons(userRanking.comparisons);
      const restored = applyComparisons(collection.images, userRanking.comparisons);
      setSortedImages(restored);
      
      const maxPasses = collection.images.length - 1;
      const totalComparisons = (collection.images.length * (collection.images.length - 1)) / 2;
      const comparisonsCount = userRanking.comparisons.length;
      
      if (comparisonsCount >= totalComparisons) {
        setShowResults(true);
        setPairIndex(collection.images.length - 1);
      } else {
        let pass = 1;
        let comparisonsUsed = 0;
        for (let p = 1; p <= maxPasses; p++) {
          const passComparisons = collection.images.length - p;
          if (comparisonsUsed + passComparisons <= comparisonsCount) {
            comparisonsUsed += passComparisons;
            pass = p + 1;
          } else {
            pass = p;
            break;
          }
        }
        setPassNumber(pass);
        setPairIndex(Math.min(comparisonsCount - (pass - 1) * (collection.images.length - (pass - 1)), collection.images.length - pass));
      }
    } else {
      setSortedImages([...collection.images]);
    }
    if (userRanking?.ratings) {
      setRatings(userRanking.ratings);
    } else {
      const initialRatings: EloRating = {};
      collection.images.forEach((img) => {
        initialRatings[img.id] = INITIAL_ELO;
      });
      setRatings(initialRatings);
    }
  }, [collection, userId]);

  const handleVote = useCallback(
    (winnerId: string, loserId: string) => {
      const winnerRating = ratings[winnerId] || INITIAL_ELO;
      const loserRating = ratings[loserId] || INITIAL_ELO;
      const { winnerNew, loserNew } = calculateElo(winnerRating, loserRating);

      setRatings((prev) => ({
        ...prev,
        [winnerId]: winnerNew,
        [loserId]: loserNew,
      }));

      const newComparisons = [...comparisons, { winnerId, loserId }];
      setComparisons(newComparisons);

      const newSorted = [...sortedImages];
      const idx = newSorted.findIndex(img => img.id === winnerId);
      const nextIdx = newSorted.findIndex(img => img.id === loserId);
      
      if (idx > nextIdx) {
        newSorted.splice(nextIdx, 2, newSorted[idx], newSorted[nextIdx]);
        setSortedImages(newSorted);
        setSwapsThisPass((prev) => prev + 1);
      }

      const nextPairIndex = pairIndex + 1;
      const maxIndex = sortedImages.length - passNumber - 1;
      
      if (nextPairIndex > maxIndex) {
        if (swapsThisPass > 0 || (idx > nextIdx ? 1 : 0) > 0) {
          setPairIndex(0);
          setPassNumber((prev) => prev + 1);
          setSwapsThisPass(0);
        } else {
          setShowResults(true);
        }
      } else {
        setPairIndex(nextPairIndex);
      }
    },
    [ratings, comparisons, sortedImages, pairIndex, passNumber, swapsThisPass]
  );

  const saveRankings = async () => {
    setSaving(true);
    try {
      const sorted = sortedImages.map(img => img.id);

      await fetch(`/api/collections/${collection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userName,
          userImage,
          comparisons,
          ranks: sorted,
          ratings,
        }),
      });
      showToast("Rankings saved successfully!", "success");
    } catch (error) {
      console.error("Error saving rankings:", error);
      showToast("Failed to save rankings", "error");
    } finally {
      setSaving(false);
    }
  };

  const rankedImages = Object.entries(ratings)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => collection.images.find((img) => img.id === id))
    .filter(Boolean) as Image[];

  const totalNeeded = (collection.images.length * (collection.images.length - 1)) / 2;
  const completion = Math.min(100, Math.round((comparisons.length / totalNeeded) * 100));
  
  const totalRankers = Object.keys(collection.rankings || {}).length;

  const currentPair = showResults
    ? null
    : sortedImages.length > 0 && pairIndex < sortedImages.length - 1
      ? [sortedImages[pairIndex], sortedImages[pairIndex + 1]] as [Image, Image]
      : null;

  if (!sortedImages.length || (!showResults && !currentPair)) {
    if (collection.images.length === 0) {
      return (
        <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <Link
                href="/collections"
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {collection.name}
                </h1>
              </div>
            </div>
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <ImageIcon className="w-8 h-8 text-blue-500" />
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                No images in this collection
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                Add some images to start ranking them
              </p>
            </div>
          </div>
        </div>
      );
    }
    return <PageSpinner />;
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/collections"
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {collection.name}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                <span>{completion}% complete • {comparisons.length} comparisons</span>
                {totalRankers > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {totalRankers} ranked
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Avatar src={userImage} name={userName} size="sm" />
            <Link
              href={`/collections/${collection.id}/compare`}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all"
            >
              <Trophy className="w-4 h-4" />
              Compare
            </Link>
            <button
              onClick={saveRankings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {showResults ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold mb-6 text-center text-gray-900 dark:text-gray-100">Your Rankings</h2>
            <div className="space-y-3">
              {rankedImages.map((image, index) => (
                <div
                  key={image.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <span
                    className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                      index === 0
                        ? "bg-yellow-400 text-yellow-900"
                        : index === 1
                        ? "bg-gray-300 text-gray-700 dark:bg-gray-400 dark:text-gray-800"
                        : index === 2
                        ? "bg-amber-600 text-white"
                        : "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-200"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <img
                    src={image.url}
                    alt={image.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {image.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Rating: {ratings[image.id]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : currentPair ? (
          <ComparisonCard
            imageA={currentPair[0]}
            imageB={currentPair[1]}
            onVote={handleVote}
          />
        ) : null}

        <div className="mt-8">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
