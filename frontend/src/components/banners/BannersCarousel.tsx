import React from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import Autoplay from 'embla-carousel-autoplay'
import LinumLabs from "@public/banners/linum-labs.svg";
import DiscordLogo from "@public/logo/discord.svg"
import XLogo from "@public/logo/x.svg"
import TelegramLogo from "@public/logo/telegram.svg"
import Link from "next/link";
import Image from 'next/image';
import { FaTrophy } from 'react-icons/fa';

// Community Banner
const StaticBanner1 = () => {
    return (
        <div
className='relative pl-6 pr-4 py-4 flex items-center justify-between w-full h-full bg-[linear-gradient(155deg,_rgb(31_79_255_/85%)_5%,_rgb(0_0_0_/40%)_25%,_rgb(96_65_139_/60%)_70%,_rgb(31_79_255)_100%)]'>
            <div className='flex flex-col justify-center'>
                <h2 className='text-white font-fustat font-bold text-xs xs:text-sm sm:text-base lg:text-lg'>
                Join our growing Community today!
                </h2>
            </div>
            <div className='relative flex items-center'>
                <div className='absolute -top-12 right-12 text-white'>
                    <p className='text-[10px] xs:text-xs sm:text-sm font-bold mb-0 mr-1'>
                      <span className="inline-block text-[13px] relative -top-[0.1rem]">*</span>
                      <span className="italic" style={{ fontFamily: 'Inter, sans-serif' }}>Clickable</span>*
                    </p>
                    <svg width="60" height="40" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M30 5 C50 5, 65 30, 50 55" stroke="white" strokeWidth="2" fill="none"/>
                        <path d="M45 45 L50 55 L60 50" stroke="white" strokeWidth="2" fill="none"/>
                    </svg>
                </div>
                <div className='flex items-center gap-5'>
                    <Link href='https://x.com/Amana_DeFi' target='_blank' className='bg-black rounded-full w-12 h-12 flex items-center justify-center transition-transform duration-300 ease-in-out hover:scale-110 hover:opacity-80'>
                        <XLogo className='w-6 h-6'/>
                    </Link>
                    <Link href='https://t.me/+QTiXW9N9CdAzMjA0' target='_blank' className='bg-black rounded-full w-12 h-12 flex items-center justify-center transition-transform duration-300 ease-in-out hover:scale-110 hover:opacity-80'>
                        <TelegramLogo className='w-6 h-6'/>
                    </Link>
                    <Link href='https://discord.gg/kG3Gfn3B9V' target='_blank' className='bg-black rounded-full w-12 h-12 flex items-center justify-center transition-transform duration-300 ease-in-out hover:scale-110 hover:opacity-80'>
                        <DiscordLogo className='w-6 h-6'/>
                    </Link>
                </div>
            </div>
        </div>
    )
}

// Supported Chains Banner
const StaticBanner2 = () => {
    const tooltipId = "deposit-chain-tooltip";
    return (
        <div
            className='pl-3 pr-2 py-1 xs:pl-4 xs:pr-3 xs:py-2 lg:pl-6 lg:pr-6 flex items-center w-full h-full bg-[linear-gradient(155deg,rgba(209_107_39_/70%)_5%,rgba(0_0_0_/40%)_20%,rgba(40_116_105_/60%)_60%,#d16b27_100%)]'>
            <div className=' flex flex-col gap-1'>
                <h2 className='text-white font-fustat font-bold text-xs xs:text-sm sm:text-base lg:text-xl'>
                    <span className='inline'>Deposit From Any Supported Chain</span>
                </h2>
                {/* <div className="flex items-center">
                    <WithTooltip content="Select token from the chain you want to deposit from, and deposit, it's that easy!">
                        <p className='text-white text-[10px] xs:text-xs sm:text-sm cursor-help'>
                        Simply choose the token of your preferred chain ⓘ
                        </p>
                    </WithTooltip>
                </div> */}
            </div>
            {/* Chain logos */}
            <div className='flex-center h-full'>
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

// Leaderboard Banner
const CarouselBanner1 = () => (
<div className='pl-3 pr-2 py-1 xs:pl-4 xs:pr-3 xs:py-2 flex items-center w-full h-full bg-[linear-gradient(155deg,rgb(50_185_79_/85%)_5%,rgba(0_0_0_/40%)_20%,rgb(106_66_146_/60%)_60%,#32B94F_100%)]'>
    <div className='w-7/12 flex flex-col gap-3'>
      <h2 className='text-white font-fustat font-bold text-xs xs:text-sm sm:text-base lg:text-lg leading-snug'>
        Earn Points. Climb<br/>
        the Leaderboard.<br/>
        Secure Your Airdrop.
      </h2>
      <a
        href='#' // TODO: Replace with actual collect link
        className='mt-2 w-fit px-4 py-1 rounded bg-[#14ca3cbf] text-white font-semibold text-sm xs:text-base shadow hover:bg-[#1dbe40b6] transition-colors duration-200'
      >
        Collect points
      </a>
    </div>
    <div className='w-2/5 flex flex-col justify-center gap-2 mr-3'>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <FaTrophy className='w-5 h-5 text-yellow-400' />
          <span className='text-white font-bold text-base'>1</span>
        </div>
        <div className='bg-black/50 border border-gray-700 rounded-lg px-2 py-1 flex flex-col items-end'>
          <span className='text-[#00ff37] font-bold text-xs xs:text-sm sm:text-base w-max'>1651M Points</span>
          <span className='text-white text-[10px]'>0xA99C...4f91</span>
        </div>
      </div>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <FaTrophy className='w-5 h-5 text-gray-400' />
          <span className='text-white font-bold text-base'>2</span>
        </div>
        <div className='bg-black/50 border border-gray-700 rounded-lg px-2 py-1 flex flex-col items-end'>
          <span className='text-[#00ff37] font-bold text-xs xs:text-sm sm:text-base w-max'>335M Points</span>
          <span className='text-white text-[10px]'>0x7696...C5A7</span>
        </div>
      </div>
      <div className='flex items-center justify-between gap-3'>
        <div className='flex items-center gap-2'>
          <FaTrophy className='w-5 h-5 text-orange-500' />
          <span className='text-white font-bold text-base'>3</span>
        </div>
        <div className='bg-black/50 border border-gray-700 rounded-lg px-2 py-1 flex flex-col items-end'>
          <span className='text-[#00ff37] font-bold text-xs xs:text-sm sm:text-base w-max'>204M Points</span>
          <span className='text-white text-[10px]'>0xDe28...1cdE</span>
        </div>
      </div>
    </div>
  </div>
)

// Audit Banner
const CarouselBanner2 = () => (
    <div className='p-4 lg:p-6 flex flex-col items-start justify-between w-full h-full bg-[linear-gradient(155deg,_rgb(31_79_255_/85%)_5%,_rgb(0_0_0_/40%)_25%,_rgb(96_65_139_/60%)_70%,_rgb(31_79_255)_100%)]'>
        <div className='w-full flex flex-col gap-2'>
            <h2 className='text-white font-fustat font-bold text-base xs:text-lg sm:text-xl leading-tight'>
                <span className='inline'>Amana DeFi</span> <span className='inline'>Successfully</span><br/>
                <span className='inline'>Audited by</span> <span className='inline font-normal'><LinumLabs className='inline-block h-6 w-auto align-middle ml-2'/></span>
            </h2>
        </div>
        <div className='w-full flex justify-between items-end mt-2'>
            <a
                href='#' // TODO: Replace with actual audit link
                className='mb-2 px-5 py-2 rounded bg-[#3D91FF] text-white font-semibold text-sm hover:bg-[#2D81EF] transition-colors duration-200'
            >
                Check Audit
            </a>
            <div className='flex items-center -space-x-2'>
                <div className='relative w-16 h-16 z-30'>
                    <Image
                        src='/banners/Ethereum_3D.png'
                        alt='Ethereum'
                        fill
                        className='object-contain rounded-full'
                    />
                </div>
                <div className='relative w-16 h-16 z-20'>
                    <Image
                        src='/banners/Polygon_3D.png'
                        alt='Polygon'
                        fill
                        className='object-contain rounded-full'
                    />
                </div>
                <div className='relative w-16 h-16 z-10'>
                    <Image
                        src='/banners/USD_Coin_3D.png'
                        alt='USDC'
                        fill
                        className='object-contain rounded-full'
                    />
                </div>
            </div>
        </div>
    </div>
)

// Avalanche & Arbitrum Integration Banner
const CarouselBanner3 = () => (
<div className='pl-4 pr-4 py-2 xs:pl-6 xs:pr-6 xs:py-4 flex items-center w-full h-full bg-[linear-gradient(155deg,rgb(232_65_66_/85%)_5%,rgba(0_0_0_/40%)_20%,rgb(31_79_255_/60%)_60%,#E84142_100%)]'>
        <div className='w-3/5 flex flex-col gap-3'>
            <h2 className='text-white font-fustat font-bold text-xs xs:text-sm sm:text-base lg:text-xl'>
                <span className='text-white'>Now Live:</span> <span className='text-white font-normal'>Avalanche &amp; Arbitrum Integration</span>
            </h2>
            <a
                href='#' // TODO: Replace with actual deposit link
                className='mt-2 w-fit px-5 py-2 rounded bg-[#F44B4B] text-white font-semibold text-[14px] shadow hover:bg-[#d13c3c] transition-colors duration-200'
            >
                Deposit now
            </a>
        </div>
        <div className='flex items-center justify-end w-2/5 gap-5 mt-16'>
            <div className='relative w-14 h-14'>
                <Image
                    src='/avalanche-avax-logo.png'
                    alt='Avalanche'
                    fill
                    className='object-contain'
                    priority
                />
            </div>
            <div className='relative w-14 h-14'>
                <Image
                    src='/arbitrum-arb-logo.png'
                    alt='Arbitrum'
                    fill
                    className='object-contain'
                    priority
                />
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
