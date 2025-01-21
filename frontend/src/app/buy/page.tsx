"use client";

import React, { useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import Footer from "../../components/Footer";
import Header from "@/components/header";
import { useRouter } from 'next/navigation';
import BuyContainer from "@/containers/BuyContainer";

function Buy({ }) {

    const account = useActiveAccount();

    return (
        <main className="min-h-screen flex flex-col container mx-auto relative overflow-hidden">
            <div className="flex flex-col flex-1 p-4 pb-10">
                <Header/>
                {
                    account &&
                    <div className="flex-1 flex flex-col justify-between py-20 pl-6">
                        <div className="flex-1">
                            <BuyContainer/>
                        </div>

                        {/* Footer aligned with the main content */}
                        <Footer/>
                    </div>
                }
            </div>
        </main>

    )
}

export default Buy
