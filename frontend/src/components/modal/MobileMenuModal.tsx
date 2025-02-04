import React, {useEffect, useState} from "react";
import {usePathname, useRouter} from "next/navigation";

export default function MobileMenuModal() {
    const [openedMobileMenu, setOpenedMobileMenu] = useState(false);
    const path = usePathname();
    const router = useRouter();

    useEffect(() => {
        setOpenedMobileMenu(false);
    }, [path]);
    return (
        <>
            <button className={`group relative w-7 h-4 flex justify-end lg:hidden ${openedMobileMenu && 'opened'}`}
                    onClick={() => setOpenedMobileMenu(!openedMobileMenu)}>
                <div
                    className='absolute w-full h-px bg-white top-0 transition-all group-[.opened]:top-1/2 group-[.opened]:-translate-y-1/2 group-[.opened]:-rotate-45 group-[.opened]:w-6'></div>
                <div
                    className='absolute top-1/2 -translate-y-1/2 w-full h-px bg-white transition-all group-[.opened]:rotate-45 group-[.opened]:w-6'></div>
                <div className='absolute bottom-0 w-2/3 h-px bg-white transition-all group-[.opened]:opacity-0'></div>
            </button>
            <div
                className={`z-[1] lg:!hidden fixed top-[var(--header-height)] bottom-0 left-0 right-0 bg-black ${openedMobileMenu ? 'flex' : 'hidden'}`}>
                <nav className="flex flex-col h-fit divide-y divide-tuatara-900 border-b border-tuatara-900 w-full text-center">
                        <span
                            className={`cursor-pointer py-6 ${path === "/" ? "font-bold text-primaryYellow" : ""
                            }`}
                            onClick={() => router.push("/")}
                        >
                            Vaults
                        </span>
                    <span
                        className={`cursor-pointer py-6 ${path === "/buy" ? "font-bold text-primaryYellow" : ""
                        }`}
                        onClick={() => router.push("/buy")}
                    >
                            Fund Wallet
                        </span>
                    <span
                        className={`cursor-pointer py-6 ${path === "/about" ? "font-bold text-primaryYellow" : ""
                        }`}
                        onClick={() => router.push("/about")}
                    >
                            About
                        </span>
                </nav>
            </div>
        </>
    )
}
