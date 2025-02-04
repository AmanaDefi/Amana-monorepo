import React from "react";
import ThirdWebLogo from "@public/logo/thirdweb.svg"
import ZetaChainLogo from "@public/logo/zetachain.svg"
import DiscordLogo from "@public/logo/discord.svg"
import XLogo from "@public/logo/x.svg"
import TelegramLogo from "@public/logo/telegram.svg"
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="flex flex-col border-t border-tuatara-900 p-6 gap-16 lg:flex-row lg:divide-x lg:divide-tuatara-900 lg:py-0 lg:px-16 lg:gap-0 max-w-[1536px] mx-auto w-full">
        <div className='flex items-center w-full justify-between lg:py-9 lg:pr-10 gap-4 md:gap-7'>
            <div className='flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-8 w-full lg:w-[unset]'>
                <span className='text-sm font-normal md:font-thin text-white lg:text-xl whitespace-nowrap'>Backed By</span>
                <div className='flex gap-3 items-center flex-wrap justify-between lg:gap-x-6 md:flex-nowrap'>
                    <Link href='https://thirdweb.com/' target='_blank'>
                        <ThirdWebLogo height={26} className='w-auto h-[26px] text-white lg:h-[22px]'/>
                    </Link>
                    <Link href='https://www.zetachain.com/' target='_blank'>
                        <ZetaChainLogo height={30} className='w-auto h-[30px] text-white lg:h-[25px]'/>
                    </Link>
                </div>
            </div>
            <span className='hidden xl:block text-lg 2xl:text-xl font-normal xl:font-thin text-white'>Powered by ZetaChain , Built on Universal EVM</span>
        </div>
        <div className='flex justify-between items-center flex-wrap gap-7 lg:flex-row lg:flex-nowrap lg:py-9 lg:pl-9'>
            <div className='flex items-center gap-4 lg:gap-6'>
                <Link href='https://x.com/Amana_DeFi' target='_blank'>
                    <XLogo height={16} className='w-auto h-4 lg:h-[18px]'/>
                </Link>
                <Link href='https://t.me/+QTiXW9N9CdAzMjA0' target='_blank'>
                    <TelegramLogo height={16} className='w-auto h-4 lg:h-[18px]'/>
                </Link>
                <Link href='https://discord.gg/kG3Gfn3B9V' target='_blank'>
                    <DiscordLogo height={16} className='w-auto h-4 lg:h-[18px]'/>
                </Link>
            </div>
            <Link href='mailto:info@amanadefi.com'>
                <span className='text-base text-white font-normal md:font-thin md:text-xl'>info@amanadefi.com</span>
            </Link>
        </div>
    </footer>
  );
};

export default Footer;
