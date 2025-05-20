"use client";

import React from "react";
import TransactionFlow from "@/Simulations/TransactionFlow";


export default function TransactionFlowPage() {
  return (
    <div className='flex flex-col w-full'>
     
      
      <div className="flex-1 flex flex-col w-full justify-between pb-10">
        <div className="flex-1 p-4 container mx-auto gap-5">
          <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between">
            <h1 className="text-white text-2xl lg:text-3xl font-bold">Transaction Flow Simulator</h1>
          </div>
          <TransactionFlow />
        </div>
      </div>
    </div>
  );
} 