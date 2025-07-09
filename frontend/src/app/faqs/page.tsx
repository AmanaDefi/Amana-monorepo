"use client";
import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallets, usePrivy } from "@privy-io/react-auth";

export default function FAQ() {
  const { wallets } = useWallets();
  const filteredWallets = wallets.filter(
    (wallet) => wallet.meta.id !== "app.phantom",
  );
  const { ready } = usePrivy();
  const user = filteredWallets[0];
  const router = useRouter();
  useEffect(() => {
    if (!user && !ready) {
      router.push("/");
    }
  }, [user, ready, router]);

  return (
    <>
      <p>Active Account: {user ? user?.address : "No active account"}</p>
      <p className="text-2xl text-zinc-600 mt-4">Coming Soon</p>
      <Link href="/" className="mt-4 text-blue-500 hover:underline">
        Take me back to Amana
      </Link>
    </>
  );
}
