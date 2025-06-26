import React, { HTMLProps, useState, useRef } from "react";
import clsx from "clsx";

export type InputNumberProps = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
} & Omit<HTMLProps<HTMLInputElement>, "value" | "onChange" | "type">;

export default function InputNumber({
  value,
  onChange,
  onFocus,
  onBlur,
  className,
  ...props
}: InputNumberProps): JSX.Element {
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isZeroValue = (val: string): boolean => {
    return val === "0" || val === "0.00" || val === "0." || val === "";
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);

    if (isZeroValue(value)) {
      setInternalValue("");
    } else {
      setInternalValue(value);
    }

    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);

    if (internalValue === "" || internalValue === "0.") {
      setInternalValue("0.00");
      const syntheticEvent = {
        ...e,
        currentTarget: {
          ...e.currentTarget,
          value: "0.00",
        },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange(syntheticEvent);
    } else {
      const syntheticEvent = {
        ...e,
        currentTarget: {
          ...e.currentTarget,
          value: internalValue,
        },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange(syntheticEvent);
    }

    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.currentTarget.value;

    if (isFocused) {
      setInternalValue(inputValue);

      if (inputValue === "" || inputValue === "0.") {
        return;
      }

      if (!isNaN(Number(inputValue)) && inputValue !== "") {
        onChange(e);
      }
    } else {
      onChange(e);
    }
  };

  const getDisplayValue = (): string => {
    if (isFocused) {
      return internalValue;
    } else {
      return value;
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
      value={getDisplayValue()}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}
