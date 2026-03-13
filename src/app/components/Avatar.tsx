"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
}

export default function Avatar({ src, name, size = "md" }: AvatarProps) {
  const sizes = {
    sm: 32,
    md: 40,
    lg: 48,
  };

  const dimension = sizes[size];

  if (src) {
    return (
      <Image
        src={src}
        alt={name || "Avatar"}
        width={dimension}
        height={dimension}
        className="rounded-full object-cover"
      />
    );
  }

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div
      className="rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-medium"
      style={{ width: dimension, height: dimension }}
    >
      {initials}
    </div>
  );
}
