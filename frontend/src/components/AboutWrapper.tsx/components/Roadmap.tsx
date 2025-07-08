"use client";

import React, { useState } from "react";
import RoadmapIcon from "@/components/svg/about/RoadmapIcon";
import { motion } from "framer-motion";
import ArrowLeftIcon from "@/components/svg/about/ArrowLeftIcon";

interface RoadmapItem {
  quarter: string;
  title: string;
  tasks: string[];
  isHighlighted?: boolean;
  highlightLabel?: string;
  highlightDescription?: string;
}

const Roadmap = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const ROADMAP_DATA: RoadmapItem[] = [
    {
      quarter: "Q1",
      title: "Product Development",
      tasks: [
        "Launch Website and App",
        "Deploy EVM-Compatible Vaults",
        "Smart Contract Audit with Linum Labs",
        "Improve UX/UI with Community Feedback",
      ],
    },
    {
      quarter: "Q2",
      title: "Product Improvement",
      tasks: [
        "Launch Curve-Convex Vaults",
        "Integrate further Blockchain Wallets",
        "Smart Account Passkey UX",
        "Reg-compliant Stablecoin Vaults",
      ],
    },
    {
      quarter: "Q3",
      title: "Institutional Growth",
      isHighlighted: true,
      highlightLabel: "We are Here",
      highlightDescription: "Enhanced Swap/Routing Engine for deeper Liquidity",
      tasks: [
        "Onboard first Institutional Vault Partners",
        "Intelligent Vaults (AI Rebalancing)",
        "Enhanced Swap/Routing Engine for deeper Liquidity",
        "Integrate further Yield Strategies",
      ],
    },
    {
      quarter: "Q4",
      title: "New Partnerships",
      tasks: [
        "Release Institutional Dashboard",
        "Launch KYC-optional Vaults",
        "TGE for Amana Token + CEX Listings",
        "Begin Work on regulated, compliant Stablecoin Products (2026 Prep)",
      ],
    },
  ];

  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % ROADMAP_DATA.length);
  };

  const goToPrevSlide = () => {
    setCurrentSlide(
      (prev) => (prev - 1 + ROADMAP_DATA.length) % ROADMAP_DATA.length,
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentSlide < ROADMAP_DATA.length - 1) {
      goToNextSlide();
    }
    if (isRightSwipe && currentSlide > 0) {
      goToPrevSlide();
    }
  };

  return (
    <section className="mt-[167px] md:mt-[275px] relative">
      <div className="relative z-30 right-[192px] xl:right-4 -bottom-3 lg:-bottom-2 xl:-bottom-0 w-full">
        <RoadmapIcon className="w-full" />
      </div>

      {/* Mobile layout */}
      <div className="md:hidden relative z-20 -mt-60">
        <div
          className="overflow-hidden relative z-20 pointer-events-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(-${currentSlide * 100}%)`,
            }}
          >
            {ROADMAP_DATA.map((item, index) => (
              <div key={index} className="w-full flex-shrink-0 px-8 ">
                {item.isHighlighted ? (
                  <div
                    className="max-w-[340px] mx-auto p-6 rounded-[24px] pb-[93px]"
                    style={{
                      background:
                        "linear-gradient(180deg, #101219 0%, #1b46e0 100%)",
                    }}
                  >
                    <div className="font-normal text-[14px] text-[#9A9CB3] mb-[49px]">
                      Roadmap
                    </div>
                    <div className="font-medium text-[24px] text-white mb-2">
                      {item.highlightLabel}
                    </div>
                    <div className="text-sm text-[#9A9CB3] mb-[146px]">
                      {item.highlightDescription}
                    </div>
                    <h2
                      className="font-bold text-[32px] mb-2"
                      style={{
                        background:
                          "linear-gradient(180deg, #f6faff 11%, #1b46e0 84.13%)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {item.quarter}
                    </h2>

                    <h3 className="font-medium text-base text-white mb-6">
                      {item.title}
                    </h3>

                    <ul className="flex flex-col gap-6">
                      {item.tasks.map((task, taskIndex) => (
                        <li
                          key={taskIndex}
                          className="font-normal text-sm text-[#9A9CB3] flex items-start gap-3"
                        >
                          <div
                            className={`w-[10px] h-[10px] rounded-full mt-1 flex-shrink-0 ${
                              taskIndex !== 2 ? "bg-[#1B46E0]" : "bg-white"
                            }`}
                          ></div>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="max-w-[330px] mx-auto h-full flex flex-col justify-end pb-[93px]">
                    <h2
                      className="font-bold text-[32px] mb-2"
                      style={{
                        background:
                          "linear-gradient(180deg, #f6faff 11%, #1b46e0 84.13%)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {item.quarter}
                    </h2>

                    <h3 className="font-medium text-base text-white mb-6">
                      {item.title}
                    </h3>

                    <ul className="flex flex-col gap-6">
                      {item.tasks.map((task, taskIndex) => (
                        <li
                          key={taskIndex}
                          className="font-normal text-sm text-[#9A9CB3] flex items-start gap-3"
                        >
                          <div className="w-[10px] h-[10px] bg-white rounded-full mt-1 flex-shrink-0"></div>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={goToPrevSlide}
            className="w-10 h-10 flex items-center justify-center disabled:opacity-50 transition-opacity rounded-full"
            style={{
              background: "rgba(217, 217, 217, 0.1)",
            }}
            disabled={currentSlide === 0}
          >
            <div
              className="w-6 h-6 flex items-center justify-center"
              style={{
                background: "#1B46E0",
                borderRadius: "100%",
              }}
            >
              <div style={{ fill: "white" }}>
                <ArrowLeftIcon />
              </div>
            </div>
          </button>
          <button
            onClick={goToNextSlide}
            className="w-10 h-10 flex items-center justify-center disabled:opacity-50 transition-opacity rounded-full"
            style={{
              background: "rgba(217, 217, 217, 0.1)",
              transform: "rotate(-180deg)",
            }}
            disabled={currentSlide === ROADMAP_DATA.length - 1}
          >
            <div
              className="w-6 h-6 flex items-center justify-center"
              style={{
                background: "#1B46E0",
                borderRadius: "100%",
              }}
            >
              <div style={{ fill: "white" }}>
                <ArrowLeftIcon />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Tablet layout */}
      <div className="hidden md:block xl:hidden relative z-20 -mt-60">
        <div
          className="overflow-hidden relative z-20 pointer-events-auto"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(-${currentSlide * 100}%)`,
            }}
          >
            {ROADMAP_DATA.map((item, index) => (
              <div
                key={index}
                className="w-full flex-shrink-0 px-8 md:px-12 lg:px-16"
              >
                {item.isHighlighted ? (
                  <div
                    className="mx-auto max-w-[340px] p-6 rounded-[24px] pb-[93px] "
                    style={{
                      background:
                        "linear-gradient(180deg, #101219 0%, #1b46e0 100%)",
                    }}
                  >
                    <div className="font-normal text-[14px] md:text-[15px] text-[#9A9CB3] mb-[49px]">
                      Roadmap
                    </div>
                    <div className="font-medium text-[24px] md:text-[28px] text-white mb-2">
                      {item.highlightLabel}
                    </div>
                    <div className="text-sm md:text-[16px] text-[#9A9CB3] mb-[146px]">
                      {item.highlightDescription}
                    </div>

                    <h2
                      className="font-bold text-[32px] md:text-[40px] mb-2"
                      style={{
                        background:
                          "linear-gradient(180deg, #f6faff 11%, #1b46e0 84.13%)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {item.quarter}
                    </h2>

                    <h3 className="font-medium text-base md:text-[18px] text-white mb-6">
                      {item.title}
                    </h3>

                    <ul className="flex flex-col gap-4 md:gap-6">
                      {item.tasks.map((task, taskIndex) => (
                        <li
                          key={taskIndex}
                          className="font-normal text-sm md:text-[16px] text-[#9A9CB3] flex items-start gap-3"
                        >
                          <div
                            className={`w-[10px] h-[10px] rounded-full mt-1 flex-shrink-0 ${
                              taskIndex !== 2 ? "bg-[#1B46E0]" : "bg-white"
                            }`}
                          ></div>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mx-auto max-w-[340px] h-full flex flex-col justify-end pb-[93px]">
                    <h2
                      className="font-bold text-[32px] md:text-[40px] mb-2"
                      style={{
                        background:
                          "linear-gradient(180deg, #f6faff 11%, #1b46e0 84.13%)",
                        backgroundClip: "text",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {item.quarter}
                    </h2>

                    <h3 className="font-medium text-base md:text-[18px] text-white mb-6">
                      {item.title}
                    </h3>

                    <ul className="flex flex-col gap-4 md:gap-6">
                      {item.tasks.map((task, taskIndex) => (
                        <li
                          key={taskIndex}
                          className="font-normal text-sm md:text-[16px] text-[#9A9CB3] flex items-start gap-3"
                        >
                          <div className="w-[10px] h-[10px] bg-white rounded-full mt-1 flex-shrink-0"></div>
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation buttons for tablet */}
        <div className="flex justify-center gap-4 mt-8">
          <button
            onClick={goToPrevSlide}
            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center disabled:opacity-50 transition-opacity rounded-full"
            style={{
              background: "rgba(217, 217, 217, 0.1)",
            }}
            disabled={currentSlide === 0}
          >
            <div
              className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center"
              style={{
                background: "#1B46E0",
                borderRadius: "100%",
              }}
            >
              <div style={{ fill: "white" }}>
                <ArrowLeftIcon />
              </div>
            </div>
          </button>
          <button
            onClick={goToNextSlide}
            className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center disabled:opacity-50 transition-opacity rounded-full"
            style={{
              background: "rgba(217, 217, 217, 0.1)",
              transform: "rotate(-180deg)",
            }}
            disabled={currentSlide === ROADMAP_DATA.length - 1}
          >
            <div
              className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center"
              style={{
                background: "#1B46E0",
                borderRadius: "100%",
              }}
            >
              <div style={{ fill: "white" }}>
                <ArrowLeftIcon />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Extra large layout (xl) - horizontal */}
      <div className="hidden xl:flex flex-row justify-between items-start px-5 max-w-[1400px] mx-auto">
        {ROADMAP_DATA.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.15 }}
            viewport={{ once: true }}
            className="relative max-w-[330px]"
          >
            {item.isHighlighted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                viewport={{ once: true }}
                className="absolute top-[-281px] left-0 min-w-[340px] h-[748px] rounded-[24px] pt-[22px] px-4 z-10"
                style={{
                  background:
                    "linear-gradient(180deg, #101219 0%, #1b46e0 100%)",
                }}
              >
                <div className="font-normal text-[16px] text-[#9A9CB3] mb-10">
                  Roadmap
                </div>

                <div className="font-normal text-[40px] text-white mb-[144px] max-h-[48px]">
                  {item.highlightLabel}
                </div>

                <h2
                  className="font-bold text-[48px] mb-2"
                  style={{
                    background:
                      "linear-gradient(180deg, #f6faff 11%, #1b46e0 84.13%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {item.quarter}
                </h2>

                <h3 className="font-medium text-base lg:text-[24px] text-white mb-6">
                  {item.title}
                </h3>

                <ul className="flex flex-col gap-8">
                  {item.tasks.map((task, taskIndex) => (
                    <motion.li
                      key={taskIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: 0.6 + taskIndex * 0.1,
                      }}
                      viewport={{ once: true }}
                      className="font-normal text-[16px] text-[#9A9CB3] flex items-start gap-3"
                    >
                      <div
                        className={`w-[10px] h-[10px] rounded-full mt-1 flex-shrink-0 ${
                          taskIndex !== 2 ? "bg-[#1B46E0]" : "bg-white"
                        }`}
                      ></div>
                      <span>{task}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ) : null}

            <div className="pl-3">
              <h2
                className="font-bold text-[48px] mb-2 min-w-[350px]"
                style={{
                  background:
                    "linear-gradient(180deg, #f6faff 11%, #1b46e0 84.13%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {item.quarter}
              </h2>

              <h3 className="font-medium text-[24px] text-white mb-6">
                {item.title}
              </h3>

              <ul className="flex flex-col gap-8 pl-2">
                {item.tasks.map((task, taskIndex) => (
                  <motion.li
                    key={taskIndex}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + taskIndex * 0.1 }}
                    viewport={{ once: true }}
                    className="font-normal text-[16px] text-[#9A9CB3] flex items-start gap-3"
                  >
                    <div className="w-[10px] h-[10px] bg-white rounded-full mt-1 flex-shrink-0"></div>
                    <span>{task}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default Roadmap;
