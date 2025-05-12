import React from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
// import {UnderAuditBanner} from "@/components/banners/UnderAuditBanner";
import {MaximizeEarningsBanner} from "@/components/banners/MaximizeEarningsBanner";
import {UnderAudit2Banner} from "@/components/banners/UnderAudit2Banner";
import {EffortlessStakingBanner} from "@/components/banners/EffortlessStakingBanner";
import Fire from "@public/banners/fire-icon.svg";
import Vault from "@public/banners/vault.svg";
import LinumLabs from "@public/banners/linum-labs.svg";
import MaximizeEarnings from "@public/banners/maximize-earnings.svg";
// Import social media icons
import DiscordLogo from "@public/logo/discord.svg"
import XLogo from "@public/logo/x.svg"
import TelegramLogo from "@public/logo/telegram.svg"
import Link from "next/link";
import Image from 'next/image';
import ResponsiveTooltip, { WithTooltip } from "@/components/common/Tooltip";

// Create a static banner component with adjusted content
const StaticBanner1 = () => {
    return (
        <div
            className='pl-3 pr-2 py-1 xs:pl-4 xs:pr-3 xs:py-2 lg:pl-6 lg:pr-6 flex items-center w-full h-full bg-[linear-gradient(155deg,rgba(96,65,187,0.6)_0%,rgba(0,0,0,0.4)_25%,rgba(0,0,0,0.4)_50%,rgba(96,65,187,0.6)_78%,rgba(31,79,255,1)_110%)]'>
            <div className='w-3/5 flex flex-col gap-1'>
                <h2 className='text-white font-fustat font-bold text-xs xs:text-sm sm:text-base lg:text-lg'>
                    <span className='inline'>Join our Community</span>
                </h2>
                <div className='flex items-center gap-3 lg:gap-4 mt-1'>
                    <Link href='https://x.com/Amana_DeFi' target='_blank' className='hover:opacity-80 transition-opacity'>
                        <XLogo className='w-auto h-3 xs:h-4 lg:h-5'/>
                    </Link>
                    <Link href='https://t.me/+QTiXW9N9CdAzMjA0' target='_blank' className='hover:opacity-80 transition-opacity'>
                        <TelegramLogo className='w-auto h-3 xs:h-4 lg:h-5'/>
                    </Link>
                    <Link href='https://discord.gg/kG3Gfn3B9V' target='_blank' className='hover:opacity-80 transition-opacity'>
                        <DiscordLogo className='w-auto h-3 xs:h-4 lg:h-5'/>
                    </Link>
                </div>
            </div>
            {/* Chain logos */}
            <div className='flex-center w-2/5 h-full'>
                <div className='relative h-full w-fit flex-center'>
                    <div className='relative h-full w-auto'>
                        <Image src="/banners/Ethereum_3D.png" alt="Ethereum" fill className="object-contain translate-x-[30%]" priority />
                    </div>
                    <div className='relative h-full w-auto'>
                        <Image src="/banners/Polygon_3D.png" alt="Polygon" fill className="object-contain" priority />
                    </div>
                    <div className='relative h-full w-auto'>
                        <Image src="/banners/USD%20Coin_3D.png" alt="USD Coin" fill className="object-contain -translate-x-[30%]" priority />
                    </div>
                </div>
            </div>
        </div>
    )
}

// Create another static banner component with adjusted content
const StaticBanner2 = () => {
    const tooltipId = "deposit-chain-tooltip";
    return (
        <div
            className='pl-3 pr-2 py-1 xs:pl-4 xs:pr-3 xs:py-2 lg:pl-6 lg:pr-6 flex items-center w-full h-full bg-[linear-gradient(155deg,rgba(40,116,105,0.6)_0%,rgba(0,0,0,0.4)_25%,rgba(0,0,0,0.4)_50%,rgba(40,116,105,0.6)_78%,rgba(209,107,39,1)_110%)]'>
            <div className='w-3/5 flex flex-col gap-1'>
                <h2 className='text-white font-fustat font-bold text-xs xs:text-sm sm:text-base lg:text-lg'>
                    <span className='inline'>Deposit from any connected chain</span>
                </h2>
                <div className="flex items-center">
                    <WithTooltip content="Select token from the chain you want to deposit from, and deposit, it's that easy!">
                        <p className='text-white text-[10px] xs:text-xs sm:text-sm cursor-help'>
                            Cross-chain deposits made simple ⓘ
                        </p>
                    </WithTooltip>
                </div>
            </div>
            {/* Chain logos */}
            <div className='flex-center w-[40%] h-full'>
                <div className='flex flex-wrap items-center justify-center gap-2'>
                    <Image src="/ZetaChain.webp" alt="ZetaChain" width={32} height={32} className="object-contain" />
                    <Image src="/ETH.png" alt="Ethereum" width={32} height={32} className="object-contain" />
                    <Image src="/base.png" alt="Base" width={32} height={32} className="object-contain" />
                    <Image src="/bnb-bnb-logo.png" alt="Binance" width={32} height={32} className="object-contain" />
                    <Image src="/polygon_logo.png" alt="Polygon" width={32} height={32} className="object-contain" />
                    <Image src="/avalanche-avax-logo.png" alt="Avalanche" width={32} height={32} className="object-contain" />
                    <Image src="/arbitrum-arb-logo.png" alt="Arbitrum" width={32} height={32} className="object-contain" />
                </div>
            </div>
        </div>
    )
}

// Modified banner components with adjusted sizes for carousel
const CarouselBanner1 = () => (
    <div className='pl-3 pr-2 py-1 xs:pl-4 xs:pr-3 xs:py-2 lg:pl-6 lg:pr-6 flex items-center w-full h-full bg-[linear-gradient(155deg,rgba(106,66,146,0.6)_0%,rgba(0,0,0,0)_25%,rgba(0,0,0,0)_50%,rgba(106,66,146,0.6)_78%,rgba(50,185,79,1)_110%)]'>
        <div className='w-3/5 flex flex-col gap-1'>
            <h2 className='text-white font-fustat font-bold text-xs xs:text-sm sm:text-base lg:text-lg'>
                <span className='inline'>Join the Leaderboard</span>
            </h2>
            <p className='text-white text-[10px] xs:text-xs sm:text-sm'>
                Deposit now to earn points and rewards
            </p>
        </div>
        <div className='flex-center w-2/5 h-full'>
            <MaximizeEarnings className='h-full w-auto max-h-[30px] xs:max-h-[40px] lg:max-h-[60px]'/>
        </div>
    </div>
)

const CarouselBanner2 = () => (
    <div className='pl-3 pr-2 py-1 xs:pl-4 xs:pr-3 xs:py-2 lg:pl-6 lg:pr-6 flex items-center w-full h-full bg-[linear-gradient(155deg,rgba(40,116,105,0.6)_0%,rgba(0,0,0,0.4)_25%,rgba(0,0,0,0.4)_50%,rgba(40,116,105,0.6)_78%,rgba(209,107,39,1)_110%)]'>
        <div className='w-3/5 flex flex-col gap-1'>
            <h2 className='text-white font-fustat font-bold text-xs xs:text-sm sm:text-base lg:text-lg'>
                <span className='inline'>Secure Your Crypto</span>
            </h2>
            <p className='text-white text-[10px] xs:text-xs sm:text-sm'>
                Fully audited and secure platform
            </p>
        </div>
        <div className='flex-center w-[30%] h-full'>
            <LinumLabs className='h-full w-auto max-h-[25px] xs:max-h-[30px] lg:max-h-[40px]'/>
        </div>
    </div>
)

const CarouselBanner3 = () => (
    <div className='pl-3 pr-2 py-1 xs:pl-4 xs:pr-3 xs:py-2 lg:pl-6 lg:pr-6 flex items-center w-full h-full bg-[linear-gradient(155deg,rgba(96,65,187,0.6)_0%,rgba(0,0,0,0.4)_25%,rgba(0,0,0,0.4)_50%,rgba(96,65,187,0.6)_78%,rgba(31,79,255,1)_110%)]'>
        <div className='w-3/5 flex flex-col gap-1'>
            <h2 className='text-white font-fustat font-bold text-xs xs:text-sm sm:text-base lg:text-lg'>
                <span className='inline'>Multiple Chains</span>
            </h2>
            <p className='text-white text-[10px] xs:text-xs sm:text-sm'>
                Support for Ethereum, Arbitrum and Base
            </p>
        </div>
        <div className='flex-center w-2/5 h-full'>
            <div className='relative h-full w-fit flex-center'>
                <div className='relative z-[3] translate-x-[20%] h-full w-auto max-h-[30px] xs:max-h-[40px] lg:max-h-[60px]'>
                    <Image src="/banners/Ethereum_3D.png" alt="Ethereum" fill className="object-contain" priority />
                </div>
                <div className='relative z-[2] h-full w-auto max-h-[30px] xs:max-h-[40px] lg:max-h-[60px]'>
                    <Image src="/banners/Polygon_3D.png" alt="Polygon" fill className="object-contain" priority />
                </div>
            </div>
        </div>
    </div>
)

export function BannersCarousel() {
    const [emblaRef] = useEmblaCarousel({
        loop: true,
        duration: 30,
    }, [
        Autoplay({
            delay: 5000,
            stopOnInteraction: false,
        })
    ])

    return (
        <div className="w-full flex flex-col md:flex-row gap-3 md:gap-4 px-2 md:px-4 py-2 md:py-4 max-w-screen-2xl mx-auto">
            {/* First static banner */}
            <div className="w-full md:w-1/3 h-[140px] xs:h-[160px] sm:h-[176px] rounded-lg overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg">
                <StaticBanner1 />
            </div>
            
            {/* Second static banner */}
            <div className="w-full md:w-1/3 h-[140px] xs:h-[160px] sm:h-[176px] rounded-lg overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg">
                <StaticBanner2 />
            </div>
            
            {/* Third banner with carousel */}
            <div className="w-full md:w-1/3 h-[140px] xs:h-[160px] sm:h-[176px] rounded-lg overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg">
                <div className="embla h-full" ref={emblaRef}>
                    <div className="embla__container h-full">
                        <div className="embla__slide h-full">
                            <CarouselBanner1 />
                        </div>
                        <div className="embla__slide h-full">
                            <CarouselBanner2 />
                        </div>
                        <div className="embla__slide h-full">
                            <CarouselBanner3 />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
