"use client";

import React from "react";
import { useActiveAccount } from "thirdweb/react";
import BuyContainer from "@/containers/BuyContainer";

function Buy({ }) {

    const account = useActiveAccount();

    return (
        <>
            {
                account &&
                <div className="flex-1 flex flex-col justify-between py-20 pl-6">
                    <div className="flex-1">
                        <BuyContainer/>
                    </div>
                </div>
            }
        </>
    )
}

export default Buy
