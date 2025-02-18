import LinumLabs from "@public/banners/linum-labs.svg"
import Fire from "@public/banners/fire-icon.svg";
import Vault from "@public/banners/vault.svg";
export function EffortlessStakingBanner() {
    return (
        <div
            className='pl-8 pr-6 py-2 lg:pl-[80px] lg:pr-[80px] 2xl:pl-[146px] 2xl:pr-[126px] flex items-center w-full aspect-[440/176] max-h-[176px] sm:max-h-[200px] sm:aspect-[1728/200] bg-[linear-gradient(155deg,rgba(40,116,105,0.6)_0%,rgba(0,0,0,0.4)_25%,rgba(0,0,0,0.4)_50%,rgba(40,116,105,0.6)_78%,rgba(209,107,39,1)_110%)]'>
            <div className='w-3/5 lg:w-2/3 flex flex-col gap-2 min-[440px]:gap-4 lg:py-2'>
                <h2 className='text-white font-fustat font-bold min-[440px]:text-xl sm:flex sm:flex-col md:text-2xl'>
                    <span className='inline'>Maximize Your Earnings with Amana DeFi{' '}</span>
                    <span className='inline font-medium text-xs min-[440px]:text-xl md:text-2xl'>Effortless staking of USDC, USDT, ETH and more</span>
                </h2>
            </div>
            <div className='flex-center w-[30%] lg:w-1/5 h-full'>
                <div className='relative h-full flex-center'>
                    <Vault className='h-full translate-x-[30%] w-auto max-h-[80px] lg:max-h-[150px]'/>
                    <Fire className='relative z-[1] -translate-x-[15%] h-full w-auto max-h-[70px] lg:max-h-[117px]'/>
                </div>
            </div>
        </div>
    )
}
