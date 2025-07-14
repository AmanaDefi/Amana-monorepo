"use client";

import React, { Suspense } from "react";
import VaultsContainer from "../containers/VaultsContainer";
import InvestBlock from "@/components/InvestBlock";

export default function Page() {
  return (
    <div className="flex h-full flex-col w-full">
        <InvestBlock />
      <div className="flex-1 h-full flex flex-col w-full justify-between">
        <div className="flex-1 h-full w-full gap-5 mt-1 md:mt-6">
          <Suspense fallback={<div>Loading...</div>}>
            <VaultsContainer />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
