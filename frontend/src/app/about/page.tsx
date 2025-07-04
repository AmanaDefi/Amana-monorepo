"use client";

import React from "react";
import { useActiveAccount } from "thirdweb/react";
import Aboutcomponent from "@/components/About";

function About({ }) {

    const account = useActiveAccount();

    return (
        <>
            {
                account &&
                <div className="flex-1 flex flex-col justify-between py-20 pl-6">
                    <div className="flex-1">
                        <Aboutcomponent/>
                    </div>
                </div>
            }
        </>
    )
}

export default About
