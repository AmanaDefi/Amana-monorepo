import { Token } from "@/types/types";
import Image from "next/image";
import { EllipsisHorizontalIcon } from "@heroicons/react/24/outline";

interface WalletTokenProps {
    token: Token
}

export default function WalletToken({ token }: WalletTokenProps) {
    return (
        <div className="grid grid-cols-4 gap-4 rounded mt-4 shadow-md">
            <div className="grid-item p-4 rounded-lg flex items-center gap-2">
                <div className="relative w-8 h-8 rounded-full">
                    <Image src={token.imgURL} fill className="rounded-full" alt="Token Image" />
                </div>
                <div>
                    {token.name}
                    {token.balance.formatted} {token.symbol}
                </div>
            </div>
            <div className="grid-item flex items-center p-4 rounded-lg">
                {`$${token.balance.formattedUSD}`}
            </div>
            <div className="grid-item flex items-center p-4 rounded-lg">
                {`$${token.price}`}
            </div>
            <div className="flex grid-item p-4 rounded-lg gap-2">
                <div className="shadow-lg gap-2 rounded-lg p-2 border border-transparent hover:border-borderBtn hover:bg-grayBtnHover duration-300 transition-all cursor-pointer">
                    <EllipsisHorizontalIcon className="w-6 h-6" />
                </div>
            </div>
        </div>
    )

}