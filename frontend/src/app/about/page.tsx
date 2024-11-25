"use client";

import React, { useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import Footer from "../../components/Footer";
import Header from "@/components/header";
import { useRouter } from 'next/navigation';
import About from "@/components/About";

function about({ }) {

    const account = useActiveAccount();
    const router = useRouter();
    useEffect(() => {
        if (!account) {
            router.push("/");
        }
    }, [account]);

    return (
        <>
            {
                account &&
                <main className="p-4 pb-10 min-h-screen flex flex-col container mx-auto relative overflow-hidden">
                    <div className="flex flex-col h-screen">
                        <Header />
                        <div className="flex-1 flex flex-col justify-between py-20 pl-6">
                            <div className="flex-1">
                                <About />
                            </div>

                            {/* Footer aligned with the main content */}
                            <Footer />
                        </div>
                    </div>
                </main>
            }
        </>

    )
}

export default about