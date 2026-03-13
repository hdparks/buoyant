"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Avatar from "./Avatar";

export default function Header() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">Bobosort</span>
          </Link>
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </header>
    );
  }

  if (!session) {
    return (
      <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">Bobosort</span>
          </Link>
          <Link
            href="/signin"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/collections" className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900">Bobosort</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={session.user?.image}
              name={session.user?.name}
              size="sm"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
              {session.user?.name}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
