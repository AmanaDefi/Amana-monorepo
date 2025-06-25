"use client";

import { useAuthStore } from "@/store/authStore";
import { Modal } from "../base/Modal";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import clsx from "clsx";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import {
  useLoginWithEmail,
  usePrivy,
  useCreateWallet,
  useWallets,
} from "@privy-io/react-auth";

const formatEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  if (local.length <= 4) {
    return `${local[0]}***@${domain}`;
  }

  return `${local.slice(0, 3)}***${local.slice(-2)}@${domain}`;
};

export const VerifyOtpModal = () => {
  const { step, email, closeAll, authenticate, successAuth } = useAuthStore();
  const [error, setError] = useState(false);
  const { logout } = usePrivy();
  const { createWallet } = useCreateWallet();
  const { sendCode, loginWithCode } = useLoginWithEmail({
    onComplete: async (result) => {
      console.log("Success email auth", result);
      authenticate(result?.user?.wallet?.address ?? "");
      if (!result?.user?.wallet) {
        await createWallet();
      }
      successAuth();
    },
    onError: (err) => {
      console.log("Error email auth:", err);
      if (err === "linked_to_another_user") {
        logout();
      }
      setError(true);
    },
  });

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isResentdedOtp, setIsResendedOtp] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const clearAllFields = () => {
    setCode(["", "", "", "", "", ""]);
    setError(false);
    inputRefs.current[0]?.focus();
  };

  console.log(isResentdedOtp, "isResentdedOtp");

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError(false);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      const newCode = [...code];
      if (newCode[index] === "" && index > 0) {
        inputRefs.current[index - 1]?.focus();
      } else {
        newCode[index] = "";
        setCode(newCode);
        setError(false);
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "a") {
      e.preventDefault();
      inputRefs.current.forEach((input) => {
        if (input) {
          input.select();
        }
      });
    }

    if (e.key === "Escape") {
      clearAllFields();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text");
    const digits = pasteData.replace(/\D/g, "").slice(0, 6);

    if (digits.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < 6; i++) {
        newCode[i] = digits[i] || "";
      }
      setCode(newCode);
      setError(false);

      const lastFilledIndex = Math.min(digits.length - 1, 5);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  const handleSendOTP = (code: string) => {
    loginWithCode({
      code,
    });
  };

  const resendEmail = () => {
    if (isResentdedOtp) return;
    sendCode({
      email,
    });

    setIsResendedOtp(true);
    setTimeout(() => {
      setIsResendedOtp(false);
    }, 30000);
  };

  const handleSubmit = () => {
    const otp = code.join("");
    if (otp.length < 6) return;
    handleSendOTP(otp);
  };

  useEffect(() => {
    if (code.every((digit) => digit !== "")) {
      handleSubmit();
    }
  }, [code]);

  useEffect(() => {
    if (step !== "verify") {
      setCode(["", "", "", "", "", ""]);
      setError(false);
    }
  }, [step]);

  return (
    <Modal
      isOpen={step === "verify"}
      onClose={closeAll}
      paddingClass="px-9 pt-5 pb-6"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[358px] md:max-w-[440px]"
    >
      <div className="flex justify-start">
        <button
          onClick={closeAll}
          className="rounded-[8px] flex items-center justify-center w-10 h-10"
          aria-label="Close"
        >
          <CloseModalIcon width={16} height={16} />
        </button>
      </div>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-[8px] bg-[rgba(62,115,196,0.05)] flex items-center justify-center">
            <AmanaLogo width={39} height={28} />
          </div>
        </div>
        <div className="w-full flex justify-center items-center">
          <h2 className="max-w-[210px] md:max-w-[400px] text-center text-[24px] font-medium text-white mb-4">
            Enter the code we sent to
          </h2>
        </div>

        <p className="text-center text-white text-[16px] font-normal mb-[26px]">
          {formatEmail(email)}
        </p>

        <form className="flex flex-col gap-4">
          <div className="flex gap-2 md:gap-4">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={clsx(
                  "w-10 h-10 md:w-12 md:h-12 text-center text-white text-xl rounded-md bg-[#161C27] outline-none transition-all duration-200",
                  {
                    "border border-[#3E73C4]": digit !== "" && !error,
                    "border border-transparent hover:border-[#3E73C4] focus:border-[#3E73C4]":
                      digit === "" && !error,
                    "border border-[#FF1E1E]": error,
                  },
                )}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[#FF1E1E] text-sm">
                <ErrorInputIcon
                  width={16}
                  height={16}
                  className="fill-[#FF1E1E]"
                />
                <p className="text-[12px] font-normal">
                  Invalid OTP code
                  {/* {error 
                    ? "Invalid OTP code"
                    : "Max number of OTPs was send. Try again later"} */}
                </p>
              </div>
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={resendEmail}
            disabled={isResentdedOtp}
            className={clsx(
              "text-[#1B46E0] font-normal text-sm hover:underline transition disabled:no-underline",
              { "text-gray-500 hover:no-underline": isResentdedOtp },
            )}
          >
            {isResentdedOtp
              ? "New code was send to your email"
              : "Not received the email?"}
          </button>
        </div>
      </motion.div>
    </Modal>
  );
};
