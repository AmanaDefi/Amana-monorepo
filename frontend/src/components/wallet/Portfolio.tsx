import { useAbstractAccount } from "@/hooks/useAbstractAccount"
import WalletToken from "./WalletToken";

const columns = [
    "Assets", "Balance", "Price", "Actions"
]

export default function WalletPortfolio() {

    const { tokens } = useAbstractAccount();
    return (
        <div>
            <div className={`grid grid-cols-${columns.length} gap-4 rounded mt-4 px-4 shadow-lg`}>
                {columns.map((column, index) => (
                    <div className="flex grid-item items-center p-4" key={index}>
                        {column}
                    </div>
                ))}
            </div>
            <div>
                {tokens && tokens.map((token, index) => (
                    <WalletToken token={token} />
                ))}
            </div>
        </div>
    )
}