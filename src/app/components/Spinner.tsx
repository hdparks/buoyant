"use client";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div
      className={`
        ${sizes[size]}
        border-blue-600 border-t-transparent
        rounded-full
        animate-spin
        ${className}
      `}
    />
  );
}

export function SpinnerOverlay() {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-2xl">
        <Spinner size="lg" />
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 text-center">
          Loading...
        </p>
      </div>
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}
