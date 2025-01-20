"use client";

import React from "react";
import VaultsContainer from "../containers/VaultsContainer";
import Footer from "../components/Footer";
import Header from "@/components/header";
import {useActiveAccount} from "thirdweb/react";

export default function Page() {
  const account = useActiveAccount();
  return (
      <main className="p-4 pb-10 min-h-screen flex flex-col container mx-auto relative overflow-hidden">
          <div className="flex flex-col h-screen">
              <Header/>
              {
                  account &&
                  <div className="flex-1 flex flex-col justify-between py-20 pl-6">
                      <div className="flex-1">
                          <VaultsContainer/>
                      </div>

                      {/* Footer aligned with the main content */}
                      <Footer/>
                  </div>
              }
          </div>
      </main>
  );
}
