import React, { HTMLProps } from "react";
import clsx from "clsx";
import { useNumberInput } from "@/hooks/useNumberInput";
import { checkAmount } from "@/utils/utils";

export type InputNumberProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
} & Omit<HTMLProps<HTMLInputElement>, "value" | "onChange" | "type">;

export default function InputNumber({
  value,
  onChange: currentOnChange,
  onFocus,
  onBlur,
  className,
  ...props
}: InputNumberProps): JSX.Element {
  const { inputRef, displayValue, handlers } = useNumberInput({
    value,
    onChange: currentOnChange,
    onFocus,
    onBlur,
  });

  const handleAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amountString = e.target.value;
    const newAmount = checkAmount(amountString, value);
    if (newAmount !== "" && !newAmount) {
      return;
    } else {
      currentOnChange(e);
    }
  };

  return (
    <input
      {...props}
      ref={inputRef}
      className={clsx(
        "w-full h-[31px] p-0 border-none text-white text-2xl bg-inherit focus:ring-0 focus:outline-none",
        className,
      )}
      inputMode="decimal"
      autoComplete="off"
      autoCorrect="off"
      type="text"
      pattern="^[0-9]*[.,]?[0-9]*$"
      spellCheck="false"
      value={displayValue}
      {...handlers}
    />
  );
}
