"use client";

import { useAuthStore } from "@/store/authStore";
import { Modal } from "../base/Modal";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import clsx from "clsx";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import { useAuthenticate } from "@account-kit/react";

const formatEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  const maskedLocal =
    local.length > 3 ? `${local.slice(0, 3)}...` : local[0] + "...";

  return `${maskedLocal}@${domain}`;
};

export const VerifyOtpModal = () => {
  const { step, email, closeAll, authenticate } = useAuthStore();
  const {authenticate: OTPAuth} = useAuthenticate();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

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

  const handleSendOTP = (code: string) => {
    OTPAuth(
      {
        type: "otp",
        otpCode: code,
      },
      {
        onSuccess: (result) => {
          console.log(result);
          console.log("Success google auth", result);
          authenticate(result.address)
        },
        onError: (err) => {
          console.error("Error google auth:", err);
          setError(true);
        },
      },
    );
  };
  const handleSubmit = () => {
    const otp = code.join("");
    if (otp.length < 6) return;
    handleSendOTP(otp);

    // if (otp !== "123456") {
    //   setError(true);
    // } else {
    //   authenticate("0xMockUserWallet");
    // }
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
      maxWidth="max-w-[440px]"
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

        <h2 className="text-center text-[24px] font-medium text-white mb-4">
          Enter the code we sent to
        </h2>
        <p className="text-center text-white text-[16px] font-normal mb-[26px]">
          {formatEmail(email)}
        </p>

        <form className="flex flex-col gap-4">
          <div className="flex gap-4">
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
                className={clsx(
                  "w-12 h-12 text-center text-white text-xl rounded-md bg-[#161C27] outline-none transition-all duration-200",
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
            <div className="flex items-center gap-1 text-[#FF1E1E] text-sm mt-2">
              <ErrorInputIcon width={16} height={16} />
              <p className="text-[12px] font-normal">The wrong code</p>
            </div>
          )}
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => console.log("Resend code")}
            className="text-[#1B46E0] font-normal text-sm hover:underline transition"
          >
            Not received the email?
          </button>
        </div>
      </motion.div>
    </Modal>
  );
};
