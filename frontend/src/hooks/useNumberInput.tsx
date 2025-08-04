import { checkAmount } from "@/utils/utils";
import { useState, useRef } from "react";

export type UseNumberInputOptions = {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
};

export function useNumberInput({
  value,
  onChange,
  onFocus,
  onBlur,
}: UseNumberInputOptions) {
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isZeroValue = (val: string): boolean => {
    return val === "0" || val === "0.00" || val === "0." || val === "";
  };

  const createSyntheticEvent = (
    originalEvent:
      | React.FocusEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLInputElement>,
    newValue: string,
  ): React.ChangeEvent<HTMLInputElement> => {
    return {
      ...originalEvent,
      currentTarget: {
        ...originalEvent.currentTarget,
        value: newValue,
      },
    } as React.ChangeEvent<HTMLInputElement>;
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);

    if (isZeroValue(value)) {
      setInternalValue("");
      onChange({
        currentTarget: { value: "" },
      } as React.ChangeEvent<HTMLInputElement>);
    } else {
      setInternalValue(value);
    }

    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);

    if (internalValue === "" || internalValue === "0.") {
      setInternalValue("0.00");
      const syntheticEvent = createSyntheticEvent(e, "0.00");
      onChange(syntheticEvent);
    } else {
      const syntheticEvent = createSyntheticEvent(e, internalValue);
      onChange(syntheticEvent);
    }

    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.currentTarget.value;
    const newAmount = checkAmount(inputValue, value);

    if (newAmount === "") {
      onChange(e);
      setInternalValue(newAmount);
      return;
    }

    if (!newAmount && newAmount !== "") return;

    if (isFocused) {
      setInternalValue(newAmount);

      if (!isNaN(Number(newAmount)) && newAmount !== "") {
        onChange(e);
      }
    } else {
      onChange(e);
    }
  };

  const getDisplayValue = (): string => {
    return isFocused ? internalValue : value;
  };

  return {
    inputRef,
    displayValue: getDisplayValue(),
    handlers: {
      onFocus: handleFocus,
      onBlur: handleBlur,
      onChange: handleChange,
    },
  };
}
