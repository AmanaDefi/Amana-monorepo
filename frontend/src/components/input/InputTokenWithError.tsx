import type { HTMLProps } from "react";
import { Token } from "@/types/types";
import SelectToken from "@/components/input/SelectToken";
import InputNumber from "@/components/input/InputNumber";
import { NumberFormatter } from "@/utils/utils";

export default function InputTokenWithError({
  tokenList,
  selectedToken,
  errorMessage,
  allowSelection,
  onSelectToken,
  captionText,
  getToken,
  allowInput,
  inputMoreThanBalance,
  disabled = false,
  ...props
}: {
  errorMessage?: string;
  onSelectToken: (token: Token) => void;
  tokenList: Token[];
  selectedToken?: Token;
  allowSelection?: boolean;
  captionText?: string;
  getToken?: Function;
  allowInput?: boolean;
  inputMoreThanBalance?: boolean;
  disabled?: boolean
} & HTMLProps<HTMLInputElement>): JSX.Element {
  return (
    <div className={disabled ? "opacity-50 cursor-default" : ""}>
      {captionText && (
        <p className="text-white text-start">
          {captionText}
          {inputMoreThanBalance && (
            <span className="text-red-500 ml-2">Input More than Balance</span>
          )}
        </p>
      )}
      <div className="relative flex items-center w-full">
        <div
          className={`w-full px-5 pt-4 pb-2 rounded-lg border ${errorMessage ? "border-red-500" : "border-customGray100"}`}
        >
          <div className="flex items-center justify-between ">
            <div className="xs:w-full xs:border-r xs:border-customGray500 xs:pr-4 smmd:p-0 smmd:border-none smmd:w-1/2">
              <InputNumber {...props} disabled={disabled} />
            </div>
            <div className="xs:w-fit xs:pl-4 smmd:p-0 smmd:w-1/2">
              <SelectToken
                allowSelection={allowSelection!}
                selectedToken={selectedToken!}
                options={tokenList}
                selectToken={onSelectToken}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-4 w-full text-customGray500">
            <p className="group-hover/max:text-white">
              $ {NumberFormatter.format(Number(props.value) * (selectedToken?.price || 0))}
            </p>
          </div>
        </div>
      </div>
      {errorMessage && (
        <p className="text-red-500 pt-2 leading-6">{errorMessage}</p>
      )}
    </div>
  );
}
