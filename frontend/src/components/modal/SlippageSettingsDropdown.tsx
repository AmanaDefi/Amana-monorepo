import React, { useEffect, useState, useRef } from "react";
import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { useSlippage } from "@/hooks/hooks";
import { EMPTY_BALANCE } from "@/utils/helpers";
import {
  CheckTheTxIsInProgress,
  updateLocalStorageObject,
} from "@/utils/localStorageUtils";
import { bigIntReplacer } from "@/utils/utils";
import { InfoBlock } from "../VaultsWrapper/components/InfoBlock.tsx/index";
import CloseModalIcon from "../svg/CloseModalIcon";
import AutoDropdownIcon from "../svg/AutoDropdownIcon";
import { DEFAULT_SETTINGS } from "@/types/types";

const presetValues = [0.1, 0.5, 1.0];

export default function SlippageSettingsDropdown({
  setInputBalance,
  vaultId,
}: {
  setInputBalance: Function;
  vaultId: string;
}) {
  const { slippageValue, isAuto, setSlippage, toggleAuto } =
    useSlippage(vaultId);
  const [isOpen, setIsOpen] = useState(false);
  const [customInputValue, setCustomInputValue] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (CheckTheTxIsInProgress(vaultId)) return;

    if (isOpen) {
      const isPreset = presetValues.includes(slippageValue) || isAuto;
      setShowCustomInput(!isPreset);
      setCustomInputValue(!isPreset ? slippageValue.toString() : "");

      setInputBalance(EMPTY_BALANCE);
      updateLocalStorageObject(vaultId, {
        inputBal: JSON.stringify(EMPTY_BALANCE, bigIntReplacer),
      });
    }
  }, [isOpen, slippageValue, isAuto, setInputBalance, vaultId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        if (customInputValue === "" && slippageValue === 0.5) {
          toggleAuto(vaultId);
        }
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, slippageValue, customInputValue, toggleAuto, vaultId]);

  const handlePresetSelect = (value: number) => {
    if (CheckTheTxIsInProgress(vaultId)) return;
    if (isAuto) toggleAuto(vaultId);
    setSlippage(vaultId, value);
    setShowCustomInput(false);
    setCustomInputValue("");
  };

  const handleAutoToggle = () => {
    if (CheckTheTxIsInProgress(vaultId)) return;
    toggleAuto(vaultId);
    setShowCustomInput(false);
    setCustomInputValue("");
  };

  const handleCustomClick = () => {
    if (CheckTheTxIsInProgress(vaultId)) return;

    setShowCustomInput(true);
    setCustomInputValue(
      presetValues.includes(slippageValue) ? "" : slippageValue.toFixed(2),
    );
  };

  const handleCustomInputChange = (value: string) => {
    if (CheckTheTxIsInProgress(vaultId)) return;
    if (/[^0-9.]/.test(value) || (value.match(/\./g) || []).length > 1) return;

    setCustomInputValue(value);
  };

  const handleCustomInputBlur = () => {
    const numValue = parseFloat(customInputValue);

    if (isNaN(numValue) || numValue === 0) {
      if (!isAuto) {
        toggleAuto(vaultId);
      }
      setCustomInputValue("");
      return;
    }

    if (numValue >= 0.1 && numValue <= 100) {
      setCustomInputValue(numValue.toFixed(2));
      if (isAuto) toggleAuto(vaultId);
      setSlippage(vaultId, numValue);
    } else {
      if (!isAuto) {
        toggleAuto(vaultId);
      }
      setCustomInputValue("");
    }
  };
  const isPresetActive = (v: number) =>
    (!isAuto && !showCustomInput && slippageValue === v) ||
    (isAuto && v === DEFAULT_SETTINGS.slippage.value);

  const isCustomActive = () =>
    !isAuto && (!presetValues.includes(slippageValue) || showCustomInput);

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="group">
        <Cog6ToothIcon className="w-6 h-6 text-customGray300 group-hover:text-[#1B46E0] group-hover:color-[#1B46E0] transition-transform duration-700" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 z-50"
            style={{
              width: "240px",
              background: "#1D2A41",
              borderRadius: "8px",
              padding: "8px 13px 16px 13px",
            }}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-white transition-colors p-3"
            >
              <CloseModalIcon width={12} height={12} />
            </button>

            <div className="flex items-center gap-2 mb-6 mt-6">
              <span className="text-white text-[16px]">Max slippage</span>
              <InfoBlock isMiddle>
                💡 Your transaction will revert if the price changes by more
                than the slippage percentage.
              </InfoBlock>
            </div>

            <div className="flex flex-wrap mb-3 gap-2 max-w-[214px]">
              <button
                onClick={handleAutoToggle}
                className={`px-[10px] py-1 rounded-full font-medium transition-all flex items-center gap-[10px] ${
                  isAuto
                    ? "bg-[#3E73C4] text-white"
                    : "bg-[#161C27] text-gray-300 hover:bg-[#3E73C4]"
                }`}
              >
                <AutoDropdownIcon width={16} height={17} />
                <p className="text-[16px]">Auto</p>
              </button>

              {presetValues.map((v) => (
                <button
                  key={v}
                  onClick={() => handlePresetSelect(v)}
                  className={`px-[10px] py-1 rounded-full text-[16px] transition-all ${
                    isPresetActive(v)
                      ? "bg-[#3E73C4] text-white"
                      : "bg-[#161C27] text-gray-300 hover:bg-[#3E73C4]"
                  }`}
                >
                  {v.toFixed(1)}%
                </button>
              ))}

              {showCustomInput ? (
                <div
                  className={`flex items-center px-3 py-2 rounded-full flex-1 ${
                    isCustomActive() ? "bg-[#161C27]" : "bg-[#3E73C4]"
                  }`}
                >
                  <input
                    type="text"
                    className="bg-transparent text-white text-[16px] outline-none w-[100px]"
                    value={customInputValue}
                    onChange={(e) => handleCustomInputChange(e.target.value)}
                    onBlur={handleCustomInputBlur}
                  />
                  <span className="text-gray-300 ml-1">%</span>
                </div>
              ) : (
                <button
                  onClick={handleCustomClick}
                  className={`px-[10px] py-1 rounded-full text-[16px] flex-1 max-w-[100px] ${
                    isCustomActive()
                      ? "bg-[#3E73C4] text-white"
                      : "bg-[#161C27] text-[#535E73] hover:bg-[#3E73C4]"
                  }`}
                >
                  Custom <span className="text-white">%</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
