import type { HTMLProps } from "react";

export default function InputNumber(
  props: HTMLProps<HTMLInputElement>
): JSX.Element {
  return (
    <input
      {...props}
      className="w-full h-[31px] p-0 border-none text-white text-2xl bg-inherit focus:ring-0 focus:outline-none"
      inputMode="decimal"
      autoComplete="off"
      autoCorrect="off"
      // text-specific options
      type="text"
      pattern="^[0-9]*[.,]?[0-9]*$"
      spellCheck="false"
    />
  );
}
