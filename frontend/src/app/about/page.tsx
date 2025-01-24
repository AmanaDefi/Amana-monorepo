"use client";

import React from "react";
import { useActiveAccount } from "thirdweb/react";
import Footer from "../../components/Footer";
import Header from "@/components/header";
import Aboutcomponent from "@/components/About";

function About({ }) {

    const account = useActiveAccount();

    return (
        <main className="p-4 pb-10 min-h-screen flex flex-col container mx-auto relative overflow-hidden">
            <div className="flex flex-col flex-1">
                <Header/>
                {
                    account &&
                    <div className="flex-1 flex flex-col justify-between py-20 pl-6">
                        <div className="flex-1">
                            <Aboutcomponent/>
                        </div>

                        {/* Footer aligned with the main content */}
                        <Footer/>
                    </div>
                }
            </div>
        </main>

    )
}

export default About
