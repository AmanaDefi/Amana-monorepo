import ChainTokenSelector from "@/components/input/ChainTokenSelector";
import clsx from "clsx";

export const DepositInput = () => {
    return (
        <div>
          <div className="relative flex w-full flex-col">
            <div
              style={{ boxShadow: "0 2px 6px 0 rgba(0, 0, 0, 0.25)" }}
              className={clsx(
                "w-full max-h-[75px] bg-[#161C27] pl-5 py-[11px] pr-[10px] rounded-lg border transition-all duration-200",
                "border-[#535E73]",
                "hover:border-[#3E73C4]",
                isInputFocused && "border-[#3E73C4]",
              )}
            >
              <div className="flex items-center justify-between text-sm text-[#535E73]">
                {renderTopSection()}
                <p className="group-hover/max:text-white">{renderUSDValue()}</p>
              </div>
    
              <div className="flex items-center justify-between mt-1">
                <span className="text-white text-2xl">{renderMainValue()}</span>
    
                <div className="flex items-center">
                    <ChainTokenSelector
                      selectedToken={selectedToken}
                      selectedChain={selectedChain}
                      onSelectToken={onSelectToken}
                      vaultData={vaultData}
                      className="justify-end"
                    />
                 
                </div>
              </div>
            </div>
          </div>
        </div>
      );
}