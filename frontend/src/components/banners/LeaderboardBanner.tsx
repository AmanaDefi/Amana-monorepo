import Image from "next/image"
import TrophyGold from "@public/banners/trophy-gold.svg"
import TrophySilver from "@public/banners/trophy-silver.svg"
import TrophyBronze from "@public/banners/trophy-bronze.svg"

export function LeaderboardBanner() {
    return (
        <div
            className="pl-8 pr-6 py-2 lg:pl-[80px] lg:pr-[80px] 2xl:pl-[146px] 2xl:pr-[126px] flex items-center w-full aspect-[440/176] max-h-[176px] sm:max-h-[200px] sm:aspect-[1728/200]"
            style={{
                background: "radial-gradient(circle at left, #000000 17%, #6A4292 60%, #32B94F 100%)"
            }}
        >
            {/* Left content */}
            <div className="w-3/5 lg:w-2/3 flex flex-col gap-2 min-[440px]:gap-4 lg:py-2">
                <h2 className="text-white font-fustat font-bold min-[440px]:text-xl sm:flex sm:flex-col md:text-2xl leading-snug">
                    Earn Points. Climb the Leaderboard.<br />Secure Your Airdrop.
                </h2>
                <button className="mt-2 w-fit bg-[#00FF84] text-black font-semibold px-4 py-2 rounded hover:opacity-90 transition-all">
                    Check us out
                </button>
            </div>

            {/* Right leaderboard */}
            <div className="w-2/5 lg:w-1/3 flex flex-col gap-4 justify-center items-start">
                <LeaderboardRow
                    rank={1}
                    icon={TrophyGold}
                    points="1651M"
                    address="0xA99C...4f91"
                />
                <LeaderboardRow
                    rank={2}
                    icon={TrophySilver}
                    points="335M"
                    address="0x7696...C5A7"
                />
                <LeaderboardRow
                    rank={3}
                    icon={TrophyBronze}
                    points="204M"
                    address="0xDe28...1cDE"
                />
            </div>
        </div>
    )
}

function LeaderboardRow({
    rank,
    icon,
    points,
    address
}: {
    rank: number
    icon: string
    points: string
    address: string
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-white text-lg">
                <Image src={icon} alt={`Rank ${rank}`} width={20} height={20} />
                <span>{rank}</span>
            </div>
            <div className="border border-white/30 rounded-lg px-4 py-1 flex flex-col text-xs sm:text-sm">
                <span className="text-[#00FF84] font-semibold text-base sm:text-lg">{points} Points</span>
                <span className="text-white/70 font-mono">{address}</span>
            </div>
        </div>
    )
}
