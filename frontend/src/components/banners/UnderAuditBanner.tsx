import PoweredByZeta from "@public/banners/powered-by-zetachain.svg"
import LinumLabs from "@public/banners/linum-labs.svg"
export function UnderAuditBanner() {
    return (
        <div
            className='pl-8 pr-6 py-2 lg:pl-[80px] lg:pr-[80px] 2xl:pl-[146px] 2xl:pr-[126px] flex items-center w-full aspect-[440/176] max-h-[176px] sm:max-h-[200px] sm:aspect-[1728/200] bg-[linear-gradient(155deg,rgba(40,116,105,0.6)_0%,rgba(0,0,0,0.4)_25%,rgba(0,0,0,0.4)_50%,rgba(40,116,105,0.6)_78%,rgba(31,79,255,1)_110%)]'>
            <div className='w-3/5 lg:w-2/3 flex flex-col gap-2 min-[440px]:gap-4 lg:py-2'>
                <h2 className='text-white font-fustat font-bold min-[440px]:text-xl sm:flex sm:flex-col md:text-2xl'>
                    <span className='inline'>Amana DeFi currently under audit{' '}</span>
                    <span className='inline font-medium'>- more details coming soon</span>
                </h2>
                <div className='flex items-center md:gap-4 lg:gap-10'>
                    <button className='cursor-pointer px-1 py-2.5 lg:px-4 lg:py-2 bg-cyan-600 hover:bg-cyan-600/80 rounded-[5px] w-fit h-fit flex-center'>
                        <span
                            className='block text-white font-fustat font-bold text-xs min-[440px]:text-base !leading-none lg:text-lg'>Check us out</span>
                    </button>
                    <LinumLabs className='hidden md:block h-7 2xl:h-auto w-auto max-h-[51px]'/>
                </div>
            </div>
            <div className='flex-center w-2/5 lg:w-1/3 h-full'>
                <PoweredByZeta className='h-full w-auto max-h-[110px] lg:max-h-[180px]'/>
            </div>
        </div>
    )
}
