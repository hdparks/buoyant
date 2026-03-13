"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, BarChart3, GitCompare, Activity } from "lucide-react";
import { Collection, Image, UserRanking } from "@/app/lib/storage";
import Avatar from "@/app/components/Avatar";

interface CompareViewProps {
  collection: Collection;
}

interface RankData {
  image: Image;
  avgRank: number;
  rankByUser: Record<string, number>;
  stdDev: number;
}

type VizType = "ranked" | "consensus" | "outliers" | "matrix" | "timeline";

export default function CompareView({ collection }: CompareViewProps) {
  const [activeViz, setActiveViz] = useState<VizType>("ranked");

  const rankings = Object.values(collection.rankings || {});
  const users = rankings.map((r) => ({
    id: r.userId,
    name: r.userName || "Anonymous",
    image: r.userImage,
  }));

  const rankData: RankData[] = collection.images.map((image) => {
    const ranks: number[] = [];
    const rankByUser: Record<string, number> = {};

    rankings.forEach((r, idx) => {
      const rank = r.ranks?.indexOf(image.id) ?? -1;
      if (rank >= 0) {
        ranks.push(rank + 1);
        rankByUser[r.userId] = rank + 1;
      }
    });

    const avgRank = ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : 0;
    const stdDev = ranks.length > 1
      ? Math.sqrt(ranks.reduce((sum, r) => sum + Math.pow(r - avgRank, 2), 0) / ranks.length)
      : 0;

    return { image, avgRank, rankByUser, stdDev };
  }).sort((a, b) => a.avgRank - b.avgRank);

  const avgRanks = rankData.map((r) => r.avgRank);
  const maxAvgRank = Math.max(...avgRanks, 1);

  const getRankColor = (rank: number, avgRank: number) => {
    const diff = rank - avgRank;
    if (Math.abs(diff) <= 0.5) return "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300";
    if (diff > 0) return "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300";
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
  };

  const vizOptions: { id: VizType; label: string; icon: React.ReactNode }[] = [
    { id: "ranked", label: "Ranked List", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "consensus", label: "Consensus", icon: <Users className="w-4 h-4" /> },
    { id: "outliers", label: "Outliers", icon: <GitCompare className="w-4 h-4" /> },
    { id: "matrix", label: "Agreement", icon: <Users className="w-4 h-4" /> },
    { id: "timeline", label: "Timeline", icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href={`/collections/${collection.id}`}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Compare Results
            </h1>
            <p className="text-gray-500 dark:text-gray-400">{collection.name}</p>
          </div>
        </div>

        {users.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No rankings yet</p>
            <Link
              href={`/collections/${collection.id}`}
              className="text-blue-600 hover:underline mt-2 inline-block"
            >
              Be the first to rank
            </Link>
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {vizOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setActiveViz(opt.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    activeViz === opt.id
                      ? "bg-blue-600 text-white"
                      : "bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {activeViz === "ranked" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Ranked List</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Images sorted by average rank across {users.length} user(s)
                </p>
                <div className="space-y-3">
                  {rankData.map((data, idx) => (
                    <div key={data.image.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold ${
                        idx === 0 ? "bg-yellow-400 text-yellow-900" :
                        idx === 1 ? "bg-gray-300 text-gray-700 dark:bg-gray-400 dark:text-gray-800" :
                        idx === 2 ? "bg-amber-600 text-white" :
                        "bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-200"
                      }`}>
                        {idx + 1}
                      </span>
                      <img src={data.image.url} alt={data.image.name} className="w-16 h-16 object-cover rounded-lg" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{data.image.name}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {users.map((u) => (
                            <span key={u.id} className={`text-xs px-2 py-0.5 rounded ${getRankColor(data.rankByUser[u.id], data.avgRank)}`}>
                              {u.name.split(" ")[0]}: #{data.rankByUser[u.id] || "-"}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{data.avgRank.toFixed(1)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">avg rank</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeViz === "consensus" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Consensus Meter</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  How much agreement there is on each image&apos;s position
                </p>
                <div className="space-y-4">
                  {rankData.map((data) => {
                    const maxPossible = users.length;
                    const positions = Object.values(data.rankByUser);
                    const counts: Record<number, number> = {};
                    positions.forEach((p) => { counts[p] = (counts[p] || 0) + 1; });
                    const maxCount = Math.max(...Object.values(counts), 1);
                    const agreement = maxCount / maxPossible;
                    return (
                      <div key={data.image.id} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <img src={data.image.url} alt={data.image.name} className="w-8 h-8 object-cover rounded" />
                            <span className="truncate max-w-[200px]">{data.image.name}</span>
                          </div>
                          <span className="font-medium">{Math.round(agreement * 100)}% agree</span>
                        </div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              agreement >= 0.7 ? "bg-green-500" :
                              agreement >= 0.4 ? "bg-yellow-500" : "bg-red-500"
                            }`}
                            style={{ width: `${agreement * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeViz === "outliers" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Outlier Detection</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Images where rankings diverged significantly
                </p>
                <div className="space-y-3">
                  {[...rankData]
                    .sort((a, b) => b.stdDev - a.stdDev)
                    .filter(d => d.stdDev > 0.5)
                    .map((data) => (
                      <div key={data.image.id} className="flex items-center gap-4 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-200 dark:border-amber-700">
                        <img src={data.image.url} alt={data.image.name} className="w-16 h-16 object-cover rounded-lg" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">{data.image.name}</p>
                          <div className="flex gap-2 mt-1">
                            {users.map((u) => (
                              <span key={u.id} className="text-xs bg-white dark:bg-gray-700 px-2 py-0.5 rounded border dark:border-gray-600">
                                {u.name.split(" ")[0]}: #{data.rankByUser[u.id] || "-"}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-700 dark:text-amber-400">σ {data.stdDev.toFixed(1)}</p>
                          <p className="text-xs text-amber-600 dark:text-amber-500">divergence</p>
                        </div>
                      </div>
                    ))}
                  {rankData.filter(d => d.stdDev > 0.5).length === 0 && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No significant outliers found</p>
                  )}
                </div>
              </div>
            )}

            {activeViz === "matrix" && users.length > 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Agreement Matrix</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  How often each pair of users agrees on rankings
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="p-2"></th>
                        {users.map((u) => (
                          <th key={u.id} className="p-2">
                            <div className="flex flex-col items-center">
                              <Avatar src={u.image} name={u.name} size="sm" />
                              <span className="text-xs mt-1 truncate max-w-[60px]">{u.name.split(" ")[0]}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u1) => (
                        <tr key={u1.id}>
                          <td className="p-2">
                            <div className="flex flex-col items-center">
                              <Avatar src={u1.image} name={u1.name} size="sm" />
                              <span className="text-xs mt-1 truncate max-w-[60px]">{u1.name.split(" ")[0]}</span>
                            </div>
                          </td>
                          {users.map((u2) => {
                            const r1 = rankings.find(r => r.userId === u1.id);
                            const r2 = rankings.find(r => r.userId === u2.id);
                            let agree = 0, total = 0;
                            if (r1?.ranks && r2?.ranks) {
                              r1.ranks.forEach((imgId, idx) => {
                                if (r2.ranks![idx] === imgId) agree++;
                                total++;
                              });
                            }
                            const pct = total > 0 ? (agree / total) * 100 : 0;
                            return (
                              <td key={u2.id} className="p-1">
                                <div
                                  className={`w-12 h-12 flex items-center justify-center rounded text-sm font-medium ${
                                    u1.id === u2.id ? "bg-gray-100 dark:bg-gray-700 text-gray-400" :
                                    pct >= 70 ? "bg-green-500 text-white" :
                                    pct >= 40 ? "bg-yellow-500 text-white" :
                                    "bg-red-500 text-white"
                                  }`}
                                >
                                  {u1.id === u2.id ? "-" : `${Math.round(pct)}%`}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeViz === "matrix" && users.length <= 1 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Need at least 2 users to show agreement matrix</p>
              </div>
            )}

            {activeViz === "timeline" && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Rank Timeline</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  How rankings evolved as more comparisons were made
                </p>
                <div className="space-y-6">
                  {rankData.slice(0, 5).map((data) => (
                    <div key={data.image.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <img src={data.image.url} alt={data.image.name} className="w-10 h-10 object-cover rounded" />
                        <span className="text-sm font-medium truncate">{data.image.name}</span>
                      </div>
                      <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded relative overflow-hidden">
                        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                          const position = data.avgRank - (1 - pct) * (data.avgRank - 1);
                          return (
                            <div
                              key={idx}
                              className="absolute w-3 h-3 rounded-full bg-blue-500 transition-all duration-300"
                              style={{
                                left: `${pct * 100}%`,
                                top: "50%",
                                transform: "translate(-50%, -50%)",
                              }}
                            />
                          );
                        })}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                          {data.avgRank.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
                  Timeline shows rank progression from initial (left) to current (right)
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
