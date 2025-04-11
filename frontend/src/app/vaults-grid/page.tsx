"use client";

import React from "react";
import NewVaultsGridContainer from "@/containers/NewVaultsGridContainer";
import { useActiveAccount } from "thirdweb/react";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { Note } from "@/components/Note";

export default function VaultsGridPage() {
  const account = useActiveAccount();
  const wallet = useWallet();
  
  return (
    <div className='flex flex-col w-full'>
      <div className='w-full text-center bg-amber-50'>
        <span className='py-2 lg:py-4 px-4 text-black text-sm'>
          This is a new vaults grid view - test page. Report any feedback <Link
            href='mailto:info@amanadefi.com' className='underline-offset-2 underline'>here</Link>
        </span>
      </div>
      
      <Note />
      
      <div className="flex-1 flex flex-col w-full justify-between pb-10">
        <div className="flex-1 p-4 container mx-auto gap-5">
          <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between">
            <h1 className="text-white text-2xl lg:text-3xl font-bold">Vaults Grid View</h1>
            <Link 
              href="/"
              className="mt-2 md:mt-0 px-4 py-2 text-white bg-customNeutral200 hover:bg-customNeutral100 transition-colors rounded-md text-sm"
            >
              Switch to Table View
            </Link>
          </div>
          <NewVaultsGridContainer />
        </div>
      </div>
    </div>
  );
} 