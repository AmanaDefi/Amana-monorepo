"use client";

import React from "react";
import { useActiveAccount } from "thirdweb/react";
import BuyContainer from "@/containers/BuyContainer";
import Wallet from "@/components/wallet/Wallet";

function Buy({ }) {


    return (
        <div className="flex-1 flex flex-col justify-between py-20 pl-6">
            <div className="flex-1">
                <Wallet />
            </div>
        </div>
    )
}

export default Buy
