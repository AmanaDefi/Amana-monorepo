"use client";
import React, {useEffect } from "react";
import Link from "next/link";
import { useActiveAccount } from "thirdweb/react";
import { useRouter } from 'next/navigation';

export default function FAQ() {
  const account = useActiveAccount();
  const router = useRouter();
  useEffect(() => {
    if (!account) {
      router.push("/");
    }
  }, [account, router]);

  return (
      <>
          <p>Active Account: {account ? account.address : 'No active account'}</p>
          <p className="text-2xl text-zinc-600 mt-4">Coming Soon</p>
          <Link href="/" className="mt-4 text-blue-500 hover:underline">
              Take me back to Amana
          </Link>
      </>
  );
}
