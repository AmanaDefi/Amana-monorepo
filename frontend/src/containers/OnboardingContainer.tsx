"use client";
import Button from "@/components/Button";
import SmartAccountCard from "@/components/SmartAccountCard";
import { smartAccountInfo } from "@/constants/smartAccountInfo";
import { useAuthStore } from "@/store/authStore";
import AmanaLogo from "@public/logo/amanadefi/logo.svg";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";

const OnboardingContainer = () => {
  const router = useRouter();
  const { openStep } = useAuthStore();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentSlideTablet, setCurrentSlideTablet] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    slidesToScroll: 1,
    skipSnaps: false,
    dragFree: false,
  });

  const [emblaRefTablet, emblaApiTablet] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 1,
    skipSnaps: false,
    dragFree: false,
    containScroll: "trimSnaps",
  });

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width <= 767);
      setIsTablet(width >= 768 && width < 1280);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const onSelectTablet = useCallback(() => {
    if (!emblaApiTablet) return;
    setCurrentSlideTablet(emblaApiTablet.selectedScrollSnap());
  }, [emblaApiTablet]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApiTablet) return;
    onSelectTablet();
    emblaApiTablet.on("select", onSelectTablet);
    return () => {
      emblaApiTablet.off("select", onSelectTablet);
    };
  }, [emblaApiTablet, onSelectTablet]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi],
  );

  const scrollToTablet = useCallback(
    (index: number) => {
      if (emblaApiTablet) emblaApiTablet.scrollTo(index);
    },
    [emblaApiTablet],
  );

  const groupedItemsTablet = [];
  for (let i = 0; i < smartAccountInfo.length; i += 2) {
    groupedItemsTablet.push(smartAccountInfo.slice(i, i + 2));
  }

  const isLastSlide = currentSlide === smartAccountInfo.length - 1;
  const isLastSlideTablet =
    currentSlideTablet === groupedItemsTablet.length - 1;

  const handleCreateWallet = () => {
    const stepToOpen = isMobile ? "mobileOptionsB" : "optionsB";
    openStep(stepToOpen);
  };

  return (
    <>
      <div className="flex flex-col items-center px-4 font-gotham mt-6 md:mt-2">
        <AmanaLogo
          width={86}
          height={61}
          className="w-[86px] h-[61px] xl:w-[122px] md:h-[85px] mb-6 md:mb-0 xl:mb-4"
        />

        <h1 className="text-[20px] xl:text-[64px] font-bold gradient-text text-center mb-2 xl:mb-4 max-h-[61px] xl:max-h-[71px]">
          What are <span className="">smart accounts?</span>
        </h1>

        <p className="text-[14px] sm:text-[18px] xl:text-[24px] text-[#535E73] font-normal md:font-medium text-center max-w-[273px] sm:max-w-3xl max-h-[58px] mb-6 xl:mb-10 font-gotham">
          A new, secure way to use DeFi — no seed phrases, no gas fees, just
          simple login and powerful features.
        </p>
      </div>

      {/* Desktop Grid */}
      <div className="hidden xl:grid grid-cols-4 gap-[24px] w-full mx-auto px-4 max-w-[1320px]">
        {smartAccountInfo.map((info, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2, duration: 0.4 }}
          >
            <SmartAccountCard {...info} />
          </motion.div>
        ))}
      </div>

      {/* Tablet Carousel */}
      <div className="hidden md:block xl:hidden w-full ">
        <div className="overflow-hidden pl-4 pr-4" ref={emblaRefTablet}>
          <div className="flex" style={{ willChange: "transform" }}>
            {groupedItemsTablet.map((group, slideIndex) => (
              <div
                key={slideIndex}
                className={`min-w-0 pr-4 ${
                  group.length === 2
                    ? "flex-[0_0_auto] w-fit"
                    : "flex-[0_0_100%]"
                }`}
                style={{
                  transform: "translate6d(0, 0, 0)",
                  willChange: "transform",
                }}
              >
                <div
                  className={`grid gap-2 md:gap-4 ${slideIndex === groupedItemsTablet.length - 1 ? "pr-10" : "pr-4"} ${group.length === 2 ? "grid-cols-2" : "grid-cols-1 justify-items-center"}`}
                >
                  {group.map((info, index) => (
                    <motion.div
                      key={slideIndex * 2 + index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: (slideIndex * 2 + index) * 0.2,
                        duration: 0.4,
                      }}
                      className={`${group.length === 1 ? "max-w-sm mx-auto" : ""} w-full`}
                    >
                      <SmartAccountCard
                        {...info}
                        className="w-full tablet-transform"
                      />
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots Navigation for Tablet */}
        <div className="flex justify-center mt-6 space-x-2">
          {groupedItemsTablet.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToTablet(index)}
              className={`h-2 rounded-full transition-all duration-300 ease-out ${
                index === currentSlideTablet
                  ? "bg-blue-500 w-6"
                  : "bg-gray-300 hover:bg-gray-400 w-2"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Mobile Carousel */}
      <div className="md:hidden w-full px-4">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex" style={{ willChange: "transform" }}>
            {smartAccountInfo.map((info, index) => (
              <div
                key={index}
                className="flex-[0_0_100%] min-w-0 px-2 flex justify-center items-center"
                style={{
                  transform: "translate3d(0, 0, 0)",
                  willChange: "transform",
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2, duration: 0.4 }}
                  className="h-full w-full max-w-[318px]"
                >
                  <SmartAccountCard
                    {...info}
                    className="!mx-0 !h-full !flex !flex-col"
                  />
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots Navigation for Mobile */}
        <div className="flex justify-center mt-6 space-x-2">
          {smartAccountInfo.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`h-2 rounded-full transition-all duration-300 ease-out ${
                index === currentSlide
                  ? "bg-blue-500 w-6"
                  : "bg-gray-300 hover:bg-gray-400 w-2"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="max-w-[352px] mt-8 md:mt-6 mb-6 mx-auto w-full">
        <div
          className={`transition-opacity duration-300 ${
            (isMobile && !isLastSlide) || (isTablet && !isLastSlideTablet)
              ? "opacity-0 pointer-events-none"
              : "opacity-100"
          }`}
        >
          <Button
            onClick={handleCreateWallet}
            className="!w-[352px] !h-[48px]"
            variant="custom"
          >
            Create Wallet
          </Button>
        </div>
      </div>
    </>
  );
};

export default OnboardingContainer;
