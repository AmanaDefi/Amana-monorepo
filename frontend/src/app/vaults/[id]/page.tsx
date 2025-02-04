"use client";

import React from "react";
import { useActiveAccount } from "thirdweb/react";
import VaultsDetailContainer from "@/containers/VaultsDetailContainer";
import { useParams } from 'next/navigation';


function Index({ }) {

  const account = useActiveAccount();
  const { id } = useParams();

  return (
      <>
          {
              account &&
              <div className="flex-1 flex flex-col w-full justify-between py-20 pl-6">
                  <div className="flex-1">
                      <VaultsDetailContainer vaultID={id}/>
                  </div>
              </div>
          }
      </>
  )
}

export default Index
