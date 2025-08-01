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
  disabled,
  ...props
}: InputNumberProps): JSX.Element {
  const { inputRef, handlers } = useNumberInput({
    value,
    onChange: currentOnChange,
    onFocus,
    onBlur,
  });

  return (
    <input
      {...props}
      ref={inputRef}
      className={clsx(
        "w-full h-[31px] p-0 border-none text-white text-2xl bg-inherit focus:ring-0 focus:outline-none",
        disabled && "opacity-50",
        className,
      )}
      inputMode="decimal"
      autoComplete="off"
      autoCorrect="off"
      type="text"
      pattern="^[0-9]*[.,]?[0-9]*$"
      spellCheck="false"
      value={value}
      {...handlers}
    />
  );
}
