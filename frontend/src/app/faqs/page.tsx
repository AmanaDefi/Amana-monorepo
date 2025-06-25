"use client";
import React, {useEffect } from "react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { usePrivy } from "@privy-io/react-auth";

export default function FAQ() {
  const {user, ready} = usePrivy();
  const router = useRouter();
  useEffect(() => {
    if (!user && !ready) {
      router.push("/");
    }
  }, [user, ready, router]);

  return (
      <>
          <p>Active Account: {user ? user.wallet?.address: 'No active account'}</p>
          <p className="text-2xl text-zinc-600 mt-4">Coming Soon</p>
          <Link href="/" className="mt-4 text-blue-500 hover:underline">
              Take me back to Amana
          </Link>
      </>
  );
}
