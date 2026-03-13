"use client";

import { useState, useCallback } from "react";
import { Image } from "@/app/lib/storage";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface ComparisonCardProps {
  imageA: Image;
  imageB: Image;
  onVote: (winnerId: string, loserId: string) => void;
}

const SWIPE_THRESHOLD = 100;

export default function ComparisonCard({
  imageA,
  imageB,
  onVote,
}: ComparisonCardProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return;
    const deltaX = e.touches[0].clientX - touchStart;
    setSwipeX(deltaX);
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(swipeX) >= SWIPE_THRESHOLD) {
      if (swipeX > 0) {
        onVote(imageA.id, imageB.id);
      } else {
        onVote(imageB.id, imageA.id);
      }
    }
    setSwipeX(0);
    setIsSwiping(false);
    setTouchStart(null);
  }, [swipeX, imageA.id, imageB.id, onVote]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setTouchStart(e.clientX);
    setIsSwiping(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (touchStart === null || !isSwiping) return;
    const deltaX = e.clientX - touchStart;
    setSwipeX(deltaX);
  }, [touchStart, isSwiping]);

  const handleMouseUp = useCallback(() => {
    if (touchStart !== null && Math.abs(swipeX) >= SWIPE_THRESHOLD) {
      if (swipeX > 0) {
        onVote(imageA.id, imageB.id);
      } else {
        onVote(imageB.id, imageA.id);
      }
    }
    setSwipeX(0);
    setIsSwiping(false);
    setTouchStart(null);
  }, [touchStart, swipeX, imageA.id, imageB.id, onVote]);

  const handleMouseLeave = useCallback(() => {
    if (isSwiping) {
      setSwipeX(0);
      setIsSwiping(false);
      setTouchStart(null);
    }
  }, [isSwiping]);

  const getOverlayStyle = (isLeftCard: boolean) => {
    if (!isSwiping || swipeX === 0) return { opacity: 0 };
    
    const isSwipingRight = swipeX > 0;
    const opacity = Math.min(Math.abs(swipeX) / SWIPE_THRESHOLD, 1);
    
    if (isLeftCard) {
      return {
        opacity,
        backgroundColor: isSwipingRight ? 'rgba(34, 197, 94, 0.4)' : 'rgba(107, 114, 128, 0.5)',
      };
    } else {
      return {
        opacity,
        backgroundColor: isSwipingRight ? 'rgba(107, 114, 128, 0.5)' : 'rgba(34, 197, 94, 0.4)',
      };
    }
  };

  const getBadge = (isLeftCard: boolean) => {
    if (!isSwiping || Math.abs(swipeX) < 20) return null;
    
    const isSwipingRight = swipeX > 0;
    const opacity = Math.min(Math.abs(swipeX) / SWIPE_THRESHOLD, 1);
    const isWinner = isLeftCard ? isSwipingRight : !isSwipingRight;
    
    return (
      <div 
        className={`absolute p-3 rounded-full border-4 ${
          isWinner 
            ? 'bg-green-500 text-white border-green-600' 
            : 'bg-red-500 text-white border-red-600'
        }`}
        style={{ 
          opacity,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {isWinner ? (
          <ThumbsUp className="w-12 h-12" />
        ) : (
          <ThumbsDown className="w-12 h-12" />
        )}
      </div>
    );
  };

  return (
    <div 
      className="flex flex-col items-center gap-6 select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      <h2 className="text-xl font-medium text-gray-700 dark:text-gray-300">
        Which do you prefer?
      </h2>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-4xl">
        <div
          className="flex-1 group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-4 border-transparent hover:border-blue-500 transition-all cursor-pointer"
          style={{
            transform: isSwiping 
              ? `translateX(${swipeX}px) rotate(${swipeX * 0.03}deg) scale(${swipeX < 0 ? 1 - Math.min(Math.abs(swipeX) / 250, 0.75) : 1})`
              : 'none',
            transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          <div 
            className="absolute inset-0 pointer-events-none transition-opacity"
            style={getOverlayStyle(true)}
          />
          {getBadge(true)}
          <img
            src={imageA.url}
            alt={imageA.name}
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-opacity">
              I prefer this
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <span className="text-gray-400 dark:text-gray-500 font-medium">VS</span>
        </div>

        <div
          className="flex-1 group relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-4 border-transparent hover:border-blue-500 transition-all cursor-pointer"
          style={{
            transform: isSwiping 
              ? `translateX(${swipeX}px) rotate(${swipeX * 0.03}deg) scale(${swipeX > 0 ? 1 - Math.min(swipeX / 250, 0.75) : 1})`
              : 'none',
            transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
          }}
        >
          <div 
            className="absolute inset-0 pointer-events-none transition-opacity"
            style={getOverlayStyle(false)}
          />
          {getBadge(false)}
          <img
            src={imageB.url}
            alt={imageB.name}
            className="w-full h-full object-cover pointer-events-none"
            draggable={false}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-opacity">
              I prefer this
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8 text-sm text-gray-400 dark:text-gray-500">
        <span className="flex items-center gap-2">
          ← Swipe left to reject
        </span>
        <span className="flex items-center gap-2">
          Swipe right to accept →
        </span>
      </div>
    </div>
  );
}
