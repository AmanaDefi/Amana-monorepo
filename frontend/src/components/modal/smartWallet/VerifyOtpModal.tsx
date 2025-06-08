"use client";

import { useAuthStore } from "@/store/authStore";
import { Modal } from "../Modal";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import clsx from "clsx";

const formatEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;

  const maskedLocal =
    local.length > 3 ? `${local.slice(0, 3)}...` : local[0] + "...";

  return `${maskedLocal}@${domain}`;
};

export const VerifyOtpModal = () => {
  const { step, email, closeAll, authenticate } = useAuthStore();
  const [code, setCode] = useState(["", "", "", "", "", ""]);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) (nextInput as HTMLInputElement).focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const otp = code.join("");
    if (otp.length === 6) {
      // TODO: Replace with real OTP verification (e.g. Alchemy)
      console.log("Verify OTP:", otp);

      authenticate("0xMockUserWallet");
    }
  };

  useEffect(() => {
    if (step !== "verify") {
      setCode(["", "", "", "", "", ""]);
    }
  }, [step]);

  return (
    <Modal
      isOpen={step === "verify"}
      onClose={closeAll}
      paddingClass="px-9 pt-5 pb-6"
      roundedClass="rounded-[16px]"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <div className="flex justify-center mb-6 mt-10">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-[8px] bg-[rgba(62,115,196,0.05)] flex items-center justify-center">
              <AmanaLogo width={39} height={28} className="w-[39px] h-[28px]" />
            </div>
          </div>
        </div>

        <h2 className="text-center text-[24px] font-medium text-white mb-4">
          Enter the code we sent to
        </h2>
        <p className="text-center text-white text-[16px] font-normal mb-[26px]">
          {formatEmail(email)}
        </p>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col items-center gap-6"
        >
          <div className="flex justify-center gap-2">
            {code.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                className={clsx(
                  "w-12 h-12 text-center text-white text-xl rounded-md bg-[#161C27] border outline-none transition-all duration-200",
                  {
                    "border-[#3E73C4]": digit !== "", // якщо є значення — бордер синій
                    "border-transparent hover:border-[#3E73C4] focus:border-[#3E73C4]":
                      digit === "",
                  },
                )}
              />
            ))}
          </div>
        </form>

        <div className="mt-12 text-center">
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
