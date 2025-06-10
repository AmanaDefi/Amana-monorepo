"use client";

import { mockSendOtp } from "@/service/auth";
import { useAuthStore } from "@/store/authStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Modal } from "../base/Modal";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import { motion } from "framer-motion";
import ErrorInputIcon from "@/components/svg/ErrorInputIcon";
import Button from "@/components/Button";
import { useEffect } from "react";
import CloseModalIcon from "@/components/svg/CloseModalIcon";
import { useAuthenticate } from "@account-kit/react";

const schema = z.object({
  // username: z
  //   .string()
  //   .min(3, "Username must be at least 3 characters")
  //   .max(20, "Username must be at most 20 characters")
  //   .regex(
  //     /^[a-zA-Z0-9_-]+$/,
  //     "Username can only contain letters, numbers, underscores and hyphens",
  //   ),
  email: z.string().email("Invalid email address"),
});

type FormData = z.infer<typeof schema>;

export const SignUpModal = () => {
  const { step, closeAll, updateField, setLoading, setError, openStep } =
    useAuthStore();
  const { authenticate, isPending, error } = useAuthenticate();

  const handleLogin = (email: string) => {
    authenticate(
      {
        type: "email",
        email,
      },
      {
        onSuccess: (result) => {
          console.log(result);
          console.log("Success google auth", result);
        },
        onError: (err) => {
          console.error("Error google auth:", err);
          setError(err.message);
        },
      },
    );
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      updateField("email", data.email);
      // updateField("username", data.username);

      handleLogin(data.email);

      openStep("verify");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (step !== "signup") {
      reset(); // з react-hook-form
    }
  }, [step]);

  return (
    <Modal
      isOpen={step === "signup"}
      onClose={closeAll}
      paddingClass="px-4 pt-5 pb-6"
      roundedClass="rounded-[16px]"
      maxWidth="max-w-[436px]"
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
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
      >
        <div className="flex justify-center mb-5">
          <div className="w-12 h-12 rounded-[8px] bg-[rgba(62,115,196,0.05)] flex items-center justify-center">
            <AmanaLogo width={39} height={28} className="w-[39px] h-[28px]" />
          </div>
        </div>

        <h2 className="text-center text-[24px] font-medium text-white mb-6">
          Sign up
        </h2>
      </motion.div>

      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 20, delay: 0.1 }}
        className="flex flex-col gap-4 mb-8 px-[26px]"
      >
        {/* <input
          type="text"
          placeholder="Choose a username"
          {...register("username")}
          className={`w-full rounded-[8px] px-4 py-3 text-[16px] font-normal text-[#535E73] !bg-transparent border transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4] ${
            errors.username
              ? "border-[#FFC700] shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]"
              : "border-[#2C2F36]"
          }`}
        />
        {errors.username && (
          <div className="flex gap-1 color-[#FFC700] text-[#FFC700]">
            <ErrorInputIcon width={16} height={16} />
            <p className="text-[#FFC700] text-[12px] font-normal ">
              {errors.username.message}
            </p>
          </div>
        )} */}

        <input
          type="email"
          placeholder="E-mail"
          {...register("email")}
          className={`w-full rounded-[8px] px-4 py-3 text-[16px] font-normal text-[#535E73] !bg-transparent border transition-all duration-200 focus:outline-none focus:border-[#3E73C4] hover:border-[#3E73C4] ${
            errors.email
              ? "border-[#FFC700] shadow-[0_2px_6px_0_rgba(0,0,0,0.25)]"
              : "border-[#2C2F36]"
          }`}
        />
        {errors.email && (
          <div className="flex gap-1 color-[#FFC700] text-[#FFC700]">
            <ErrorInputIcon width={16} height={16} />
            <p className="text-[#FFC700] text-[12px] font-normal ">
              {errors.email.message}
            </p>
          </div>
        )}

        <Button
          type="submit"
          variant="custom"
          disabled={!isValid}
          className="w-full h-12 rounded-[8px] text-white font-bold text-[16px] shadow-md transition-all duration-200"
        >
          Continue
        </Button>
      </motion.form>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* <div className="flex flew-row items-center mb-6">
          <div className="bg-[#3f3d5a] h-[1px] w-full"></div>
          <span className="px-[17px] text-[16px] font-normal text-white">
            OR
          </span>
          <div className="bg-[#3f3d5a] h-[1px] w-full"></div>
        </div> */}

        <div className="px-[26px]">
          {/* <div className="flex justify-center mb-8">
            <button
              onClick={() => openStep("import")}
              className="w-full h-12 rounded-[8px] border border-[#3E73C4] text-white shadow-md hover:bg-[#3E73C4]/10 text-[16px] font-bold transition-all duration-200"
            >
              Import Existing Wallet
            </button>
          </div> */}

          <div className="w-full text-[#535E73] text-[12px] font-normal bg-[rgba(62,115,196,0.05)] rounded-[8px] px-[17px] py-[15px]">
            By creating or restoring a wallet, you agree to Amana’s
            <span className="text-[#1B46E0] mx-1 cursor-pointer">
              terms of use
            </span>
            and
            <span className="text-[#1B46E0] mx-1 cursor-pointer">
              privacy policy
            </span>
          </div>
        </div>
      </motion.div>
    </Modal>
  );
};
