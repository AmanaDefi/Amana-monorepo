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
  const [isMobile, setIsMobile] = useState(false);
  const [isCarouselView, setIsCarouselView] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    slidesToScroll: 1,
    skipSnaps: false,
    dragFree: false,
  });

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window?.innerWidth;
      setIsMobile(width <= 767);
      setIsCarouselView(width < 1024);
    };

    checkScreenSize();
    window?.addEventListener("resize", checkScreenSize);
    return () => window?.removeEventListener("resize", checkScreenSize);
  }, []);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCurrentSlide(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi],
  );

  const isLastSlide = currentSlide === smartAccountInfo.length - 1;

  const handleCreateWallet = () => {
    const stepToOpen = isMobile ? "mobileOptionsB" : "optionsB";
    openStep(stepToOpen);
  };

  return (
    <>
      <div className="flex flex-col items-center px-4 font-gotham mt-6 md:mt-[34px]">
        <AmanaLogo
          width={86}
          height={61}
          className="w-[86px] h-[61px] md:w-[122px] md:h-[85px] mb-6 md:mb-4"
        />

        <h1 className="text-[20px] sm:text-[48px] l:text-[64px] font-bold gradient-text text-center mb-4 md:mb-6">
          What are <span className="">smart accounts?</span>
        </h1>

        <p className="text-[14px] sm:text-[20px] md:text-[24px] text-[#535E73] font-normal md:font-medium text-center max-w-[273px] sm:max-w-3xl mb-6 md:mb-10 font-gotham">
          A new, secure way to use DeFi — no seed phrases, no gas fees, just
          simple login and powerful features.
        </p>
      </div>

      {/* Desktop Grid */}
      <div className="hidden lg:grid grid-cols-3 gap-6 sm:gap-10 w-full mx-auto px-0 md:px-4 max-w-[1560px]">
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

      {/* Mobile/Tablet Carousel */}
      <div className="lg:hidden w-full px-4">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {smartAccountInfo.map((info, index) => (
              <div
                key={index}
                className="flex-[0_0_100%] min-w-0 px-2 flex justify-center"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2, duration: 0.4 }}
                  className="h-full w-full max-w-[480px]"
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

        {/* Dots Navigation */}
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

      <div className="max-w-[352px] mt-8 md:mt-10 mb-6 mx-auto w-full px-4">
        <div
          className={`transition-opacity duration-300 ${
            isCarouselView && !isLastSlide
              ? "opacity-0 pointer-events-none"
              : "opacity-100"
          }`}
        >
          <Button
            onClick={handleCreateWallet}
            className="!w-full !h-[48px]"
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
