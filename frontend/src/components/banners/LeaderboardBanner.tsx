import Image from "next/image"

export function LeaderboardBanner() {
    return (
        <div className="w-full max-h-[200px]">
            <Image
                src="/banners/LeaderboardBanner.png"
                alt="Leaderboard Banner"
                width={1728}
                height={200}
                className="w-full h-auto object-cover"
                priority
            />
        </div>
    )
}
