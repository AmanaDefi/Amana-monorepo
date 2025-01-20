"use client";

import React from "react";
import { useActiveAccount } from "thirdweb/react";
import VaultsDetailContainer from "@/containers/VaultsDetailContainer";
import Footer from "../../../components/Footer";
import Header from "@/components/header";
import { useParams } from 'next/navigation';


function Index({ }) {

  const account = useActiveAccount();
  const { id } = useParams();

  return (
      <main className="p-4 pb-10 min-h-screen flex flex-col container mx-auto relative">
        <div className="flex flex-col">
          <Header/>
          {
              account &&
              <div className="flex-1 flex flex-col justify-between py-20 pl-6">
                <div className="flex-1">
                  <VaultsDetailContainer vaultID={id}/>
                </div>

                {/* Footer aligned with the main content */}
                <Footer/>
              </div>
          }
        </div>
      </main>
  )
}

export default Index
