const GlowIcon = ({
  position = "top-right",
}: {
  position?: "top-right" | "bottom-left" | "top-mobile" | "bottom-mobile";
}) => {
  const commonClasses =
    "pointer-events-none blur-[200px] absolute z-[-1] rounded-full";
  const styles =
    position === "top-right"
      ? "top-[100px] right-[-80px] w-[533px] h-[637px]"
      : position === "bottom-left"
        ? "bottom-[-300px] left-[-220px] w-[533px] h-[637px]"
        : position === "top-mobile"
          ? "top-[-200px] right-[-120px] w-[533px] h-[637px]"
          : "bottom-[-300px] left-[-220px] w-[533px] h-[637px]";

  return (
    <svg
      viewBox="0 0 533 637"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${commonClasses} ${styles}`}
    >
      <g filter="url(#filter0_f)">
        <circle
          cx="449.827"
          cy="187.827"
          r="249"
          transform="rotate(66.8568 449.827 187.827)"
          fill="url(#paint0_linear)"
          fillOpacity="1"
        />
      </g>
      <defs>
        <filter
          id="filter0_f"
          x="0.762579"
          y="-261.237"
          width="898.128"
          height="898.128"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="100" result="effect1_foregroundBlur" />
        </filter>
        <linearGradient
          id="paint0_linear"
          x1="200.827"
          y1="187.827"
          x2="998.664"
          y2="187.827"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0.336407" stopColor="#1a368f" />
          <stop offset="1" stopColor="#1B46E0" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default GlowIcon;
