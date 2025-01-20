"use client";

import React from "react";
import VaultsContainer from "../containers/VaultsContainer";
import Footer from "../components/Footer";
import { SUPPORTED_CHAINS } from "../constants/chainConfig";
import Header from "@/components/header";

export default function Page() {
  return (
    <main className="p-4 pb-10 min-h-screen flex flex-col container mx-auto relative overflow-hidden">
      <Header />
      <div className="flex-1 flex flex-col justify-between py-20 px-6">
        <VaultsContainer activeChain={SUPPORTED_CHAINS[0]} />
        <Footer />
      </div>
    </main>
  );
}
