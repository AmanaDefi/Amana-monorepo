"use client";

import React from "react";
import VaultsContainer from "../containers/VaultsContainer";
import InvestBlock from "@/components/InvestBlock";


export default function Page() {
  return (
    <div className='flex h-full flex-col w-full'>
      <InvestBlock />
      <div className="flex-1 h-full flex flex-col w-full justify-between pb-10">
        <div className="flex-1 h-full w-full gap-5 my-6">
          <VaultsContainer />
        </div>
      </div>
    </div>
  );
}
