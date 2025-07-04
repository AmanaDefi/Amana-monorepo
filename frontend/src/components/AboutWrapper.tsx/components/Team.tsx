"use client";

import React, { useState } from "react";
import XLogo from "@public/logo/x.svg";
import LinkedInLogo from "@public/logo/linkedIn.svg";
import { motion } from "framer-motion";
import ArrowLeftIcon from "@/components/svg/about/ArrowLeftIcon";

const teamData = [
  {
    id: 1,
    name: "Richard Jamieson",
    position: "Founder & Full Stack Dev",
    image: "/team/Richard.png",
    linkedin: "#",
    twitter: "#",
  },
  {
    id: 2,
    name: "Quirin Huber",
    position: "Marketing & Strategy",
    image: "/team/Quirin.png",
    linkedin: "#",
    twitter: "#",
  },
  {
    id: 3,
    name: "Rohit Kumar Suman",
    position: "Co-founder",
    image: "/team/Rohit.png",
    linkedin: "#",
    twitter: "#",
  },
  {
    id: 4,
    name: "Mattes Groeger",
    position: "Full Stack Dev",
    image: "/team/Mattes.png",
    linkedin: "#",
    twitter: "#",
  },
  {
    id: 5,
    name: "Valentine Zlenko",
    position: "BD & Growth",
    image: "/team/Valentine.png",
    linkedin: "#",
    twitter: "#",
  },
];

const Team = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Navigation functions for mobile swiper
  const goToNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % teamData.length);
  };

  const goToPrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + teamData.length) % teamData.length);
  };

  // Touch handlers
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

    if (isLeftSwipe && currentSlide < teamData.length - 1) {
      goToNextSlide();
    }
    if (isRightSwipe && currentSlide > 0) {
      goToPrevSlide();
    }
  };

  return (
    <section className="mt-[116px] md:mt-[364px]">
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="text-white text-[24px] lg:text-[48px] leading-[-0.04em] text-center font-bold mb-6 md:mb-10"
      >
        Meet Our Team
      </motion.h1>

      <div className="container px-4 flex flex-col justify-center items-center">
        <div className="md:hidden relative z-30">
          <div
            className="overflow-hidden relative z-30 pointer-events-auto"
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
              {teamData.map((member, index) => (
                <div key={member.id} className="w-full flex-shrink-0 px-4">
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.2 }}
                    viewport={{ once: true }}
                    whileHover={{ y: -10 }}
                    className="rounded-[24px] px-7 py-10 max-w-[358px] mx-auto shadow-lg bg-[#0D1117] text-center"
                  >
                    <motion.div
                      initial={{ scale: 0.8 }}
                      whileInView={{ scale: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.2 + 0.3 }}
                      viewport={{ once: true }}
                      className="relative w-full aspect-square rounded-[16px] overflow-hidden mb-6"
                    >
                      <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>

                    <div className="flex flex-row justify-between items-center">
                      <div className="flex flex-col gap-2 items-start justify-start">
                        <h3 className="text-white text-[20px] font-medium">
                          {member.name}
                        </h3>
                        <p className="text-gray-400 text-[14px] font-normal">
                          {member.position}
                        </p>
                      </div>

                      <div className="flex justify-center gap-3">
                        <motion.a
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          href={member.linkedin}
                          className="w-10 h-10 bg-[#1B46E0] rounded-[2000px] flex items-center justify-center hover:bg-blue-700 transition-colors"
                        >
                          <LinkedInLogo width="21" height="20" />
                        </motion.a>

                        <motion.a
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          href={member.twitter}
                          className="w-10 h-10 bg-[#1B46E0] rounded-[2000px] flex items-center justify-center hover:bg-blue-700 transition-colors"
                        >
                          <XLogo width="21" height="20" />
                        </motion.a>
                      </div>
                    </div>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation buttons for mobile swiper */}
          <div className="flex justify-center gap-4 mt-8">
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
              disabled={currentSlide === teamData.length - 1}
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

        <div className="hidden md:flex flex-col justify-center items-center">
          {/* First row - 2 members */}
          <div className="flex justify-between w-full max-w-[1034px] mb-10 items-center">
            {teamData.slice(0, 2).map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                whileHover={{ y: -10 }}
                className="rounded-[24px] px-7 py-10 w-[469px] h-[516px] shadow-lg bg-[#0D1117] text-center"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  whileInView={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.2 + 0.3 }}
                  viewport={{ once: true }}
                  className="relative w-[413px] h-[356px] rounded-[16px] overflow-hidden mb-6 mx-auto"
                >
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>

                <div className="flex flex-row justify-between items-center">
                  <div className="flex flex-col gap-2 items-start justify-start">
                    <h3 className="text-white text-[24px] font-medium">
                      {member.name}
                    </h3>
                    <p className="text-gray-400 text-[16px] font-normal">
                      {member.position}
                    </p>
                  </div>

                  <div className="flex justify-center gap-3">
                    <motion.a
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      href={member.linkedin}
                      className="w-10 h-10 bg-[#1B46E0] rounded-[2000px] flex items-center justify-center hover:bg-blue-700 transition-colors"
                    >
                      <LinkedInLogo width="21" height="20" />
                    </motion.a>

                    <motion.a
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      href={member.twitter}
                      className="w-10 h-10 bg-[#1B46E0] rounded-[2000px] flex items-center justify-center hover:bg-blue-700 transition-colors"
                    >
                      <XLogo width="21" height="20" />
                    </motion.a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Second row - 3 members */}
          <div className="flex justify-between max-w-[1431px] w-full gap-3">
            {teamData.slice(2, 5).map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.2 + 0.4 }}
                viewport={{ once: true }}
                whileHover={{ y: -10 }}
                className="rounded-[24px] px-7 py-10 w-[469px] h-[516px] shadow-lg bg-[#0D1117] text-center"
              >
                <motion.div
                  initial={{ scale: 0.8 }}
                  whileInView={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.2 + 0.7 }}
                  viewport={{ once: true }}
                  className="relative w-[413px] h-[356px] rounded-[16px] overflow-hidden mb-6 mx-auto"
                >
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>

                <div className="flex flex-row justify-between items-center">
                  <div className="flex flex-col gap-2 items-start justify-start">
                    <h3 className="text-white text-[24px] font-medium">
                      {member.name}
                    </h3>
                    <p className="text-gray-400 text-[16px] font-normal">
                      {member.position}
                    </p>
                  </div>

                  <div className="flex justify-center gap-3">
                    <motion.a
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      href={member.linkedin}
                      className="w-10 h-10 bg-[#1B46E0] rounded-[2000px] flex items-center justify-center hover:bg-blue-700 transition-colors"
                    >
                      <LinkedInLogo width="21" height="20" />
                    </motion.a>

                    <motion.a
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      href={member.twitter}
                      className="w-10 h-10 bg-[#1B46E0] rounded-[2000px] flex items-center justify-center hover:bg-blue-700 transition-colors"
                    >
                      <XLogo width="21" height="20" />
                    </motion.a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Team;
