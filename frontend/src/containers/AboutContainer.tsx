"use client";
import AboutWrapper from "@/components/AboutWrapper.tsx";
import Footer from "@/components/Footer";
import AboutLine from "@/components/svg/about/AboutLine";
import { useMultiChain } from "@/providers/MultiChainProvider";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import React from "react";
import DiscordLogo from "@public/logo/discord.svg";
import Medium from "@public/logo/medium.svg";
import XLogo from "@public/logo/x.svg";
import LinkedInLogo from "@public/logo/linkedIn.svg";
import Link from "next/link";

const AboutContainer = ({}) => {
  const { walletAddress } = useMultiChain();
  const isConnected = !!walletAddress;
  const router = useRouter();
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);

  const handleGetStartedClick = () => {
    console.log("Get Started button clicked");
    router.push("/");
  };

  return (
    <div
      ref={containerRef}
      className="font-gotham flex flex-col justify-center items-center overflow-hidden relative"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full opacity-30"
            animate={{
              x: [0, 100, 0],
              y: [0, -100, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 8 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>
      <motion.div
        style={{ y, opacity }}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center max-w-6xl relative z-10"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-sm md:text-[16px] lg:text-[20px] text-white leading-tight mb-2 md:mb-3 lg:mb-4"
        >
          Simplifying Your DeFi Investments
        </motion.p>

        <div className="text-[48px] md:text-[72px] lg:text-[96px] font-bold leading-tight">
          <div className="flex flex-col lg:flex-row lg:flex-wrap justify-center items-start lg:items-center gap-0 lg:gap-3">
            {/* Mobile version */}
            <div className="flex items-center justify-center gap-2 md:hidden">
              <motion.span
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{
                  background: "linear-gradient(90deg, #fff, #3E73C4, #fff)",
                  backgroundSize: "200% 100%",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
                className="text-white"
              >
                Amana
              </motion.span>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  duration: 0.6,
                  delay: 0.3,
                }}
                whileHover={{
                  scale: 1.1,
                  rotate: [0, -10, 10, -5, 0],
                  transition: { duration: 0.5 },
                }}
                className="cursor-pointer w-[67px] h-[39px] md:ml-10"
              >
                <Image
                  src="/amanaAbout.png"
                  alt="Elephant"
                  width={67}
                  height={39}
                />
              </motion.div>
            </div>

            {/* Tablet version */}
            <div className="hidden md:flex lg:hidden items-center justify-center gap-2">
              <motion.span
                animate={{
                  backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                }}
                style={{
                  background: "linear-gradient(90deg, #fff, #3E73C4, #fff)",
                  backgroundSize: "200% 100%",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
                className="text-white"
              >
                Amana
              </motion.span>
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  duration: 0.6,
                  delay: 0.3,
                }}
                whileHover={{
                  scale: 1.1,
                  rotate: [0, -10, 10, -5, 0],
                  transition: { duration: 0.5 },
                }}
                className="cursor-pointer w-[96px] h-[55px]"
              >
                <Image
                  src="/amanaAbout.png"
                  alt="Elephant"
                  width={96}
                  height={55}
                />
              </motion.div>
            </div>

            {/* Desktop version */}
            <motion.span
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                background: "linear-gradient(90deg, #fff, #3E73C4, #fff)",
                backgroundSize: "200% 100%",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
              className="text-white hidden lg:block"
            >
              Amana
            </motion.span>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                duration: 0.6,
                delay: 0.3,
              }}
              whileHover={{
                scale: 1.1,
                rotate: [0, -10, 10, -5, 0],
                transition: { duration: 0.5 },
              }}
              className="cursor-pointer w-[125px] h-[71px] hidden lg:block"
            >
              <Image
                src="/amanaAbout.png"
                alt="Elephant"
                width={125}
                height={71}
                
              />
            </motion.div>

            <motion.span
              animate={{
                scale: [1, 1.02, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="gradient-text"
            >
              DeFi Yield
            </motion.span>
          </div>
          <motion.div
            initial={{ opacity: 0, rotateX: 90 }}
            animate={{ opacity: 1, rotateX: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center"
          >
            <span className="gradient-text">Aggregator</span>
          </motion.div>
        </div>
      </motion.div>
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        whileHover={{
          scale: 1.05,
          boxShadow: "0 0 30px rgba(27, 70, 224, 0.5)",
        }}
        whileTap={{
          scale: 0.95,
        }}
        onClick={handleGetStartedClick}
        className="relative w-full bg-transparent border border-[#3E73C4] rounded-lg py-3 md:py-4 lg:py-4 px-6 md:px-7 lg:px-8 mt-8 min-h-[44px] md:min-h-[48px] max-w-[190px] md:max-w-[200px] lg:max-w-[192px] text-white font-medium text-center flex items-center justify-center transition-all duration-300 ease-in-out hover:bg-[#1B46E0] hover:border-[#1B46E0] hover:shadow-lg hover:shadow-[#1B46E0]/20 cursor-pointer overflow-hidden group"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 0.6,
            ease: "linear",
            repeat: Infinity,
            repeatDelay: 2,
          }}
        />
        <span className="relative z-10">Get Started</span>
      </motion.button>
      <AboutWrapper />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="flex flex-col justify-center items-center mt-[116px] md:mt-[160px] lg:mt-[217px] mb-[356px] lg:mb-[493px]"
      >
        <motion.span
          whileHover={{
            y: -5,
            textShadow: "0 10px 20px rgba(59, 130, 246, 0.3)",
          }}
          className="text-[32px] md:text-[40px] lg:text-[48px] font-normal max-w-[300px] md:max-w-[380px] lg:max-w-[450px] text-center cursor-default"
        >
          Bridge nothing Earn everything
        </motion.span>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          whileHover={{
            scale: 1.05,
            boxShadow: "0 0 30px rgba(27, 70, 224, 0.5)",
          }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGetStartedClick}
          className="relative w-full bg-transparent border border-[#3E73C4] rounded-lg py-4 px-8 mt-8 md:mt-7 lg:mt-6 max-h-[56px] max-w-[192px] md:max-w-[200px] lg:max-w-[192px] text-white font-medium transition-all duration-300 ease-in-out hover:bg-[#1B46E0] hover:border-[#1B46E0] hover:shadow-lg hover:shadow-[#1B46E0]/20 cursor-pointer overflow-hidden group z-20"
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 0.6,
              ease: "linear",
              repeat: Infinity,
              repeatDelay: 2,
            }}
          />
          Get Started
        </motion.button>
      </motion.div>
      <div
        className="hidden md:block absolute z-10 px-[68px] md:bottom-[40px] lg:bottom-[108px]"
        style={{ left: 0, right: 0 }}
      >
        <Footer isConnected={isConnected} />
      </div>
      <div className="flex md:hidden items-center gap-4 absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20">
        <Link
          href="https://www.linkedin.com/company/amana-defi"
          target="_blank"
          className="w-10 h-10 bg-[#1B46E0] rounded-full flex items-center justify-center"
        >
          <LinkedInLogo height={20} className="w-[20px] h-[20px]" />
        </Link>
        <Link
          href="https://x.com/Amana_DeFi"
          target="_blank"
          className="w-10 h-10 bg-[#1B46E0] rounded-full flex items-center justify-center"
        >
          <XLogo height={24} className="w-[24px] h-[24px]" />
        </Link>
        <Link
          href="https://discord.gg/kG3Gfn3B9V"
          target="_blank"
          className="w-10 h-10 bg-[#1B46E0] rounded-full flex items-center justify-center"
        >
          <DiscordLogo height={18} className="w-[22px] h-[26px]" />
        </Link>
        <Link
          href="https://medium.com/@amana_defi"
          target="_blank"
          className="w-10 h-10 bg-[#1B46E0] rounded-full flex items-center justify-center"
        >
          <Medium height={18} className="w-[22px] h-[26px]" />
        </Link>
      </div>
    </div>
  );
};

export default AboutContainer;
