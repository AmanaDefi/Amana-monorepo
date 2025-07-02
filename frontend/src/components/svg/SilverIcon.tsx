const SilverIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    width="24"
    height="25"
    viewBox="0 0 24 25"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <g filter="url(#filter0_d_3001_2036)">
      <path
        d="M15.0828 22.7231C13.3802 24.4256 10.6198 24.4256 8.91719 22.7231L1.27694 15.0828C-0.425647 13.3802 -0.425647 10.6198 1.27694 8.91719L8.91719 1.27694C10.6198 -0.425647 13.3802 -0.425647 15.0828 1.27694L22.7231 8.91719C24.4256 10.6198 24.4256 13.3802 22.7231 15.0828L15.0828 22.7231Z"
        fill="url(#paint0_linear_3001_2036)"
      />
      <path
        d="M9.62402 1.98438C10.9361 0.672312 13.0639 0.672312 14.376 1.98438L22.0156 9.62402C23.3277 10.9361 23.3277 13.0639 22.0156 14.376L14.376 22.0156C13.0639 23.3277 10.9361 23.3277 9.62402 22.0156L1.98438 14.376C0.672312 13.0639 0.672312 10.9361 1.98438 9.62402L9.62402 1.98438Z"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="2"
      />
    </g>
    <defs>
      <filter
        id="filter0_d_3001_2036"
        x="0"
        y="0"
        width="24"
        height="25"
        filterUnits="userSpaceOnUse"
        colorInterpolationFilters="sRGB"
      >
        <feFlood floodOpacity="0" result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          type="matrix"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
          result="hardAlpha"
        />
        <feOffset dy="1" />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.117138 0 0 0 0 0.176258 0 0 0 0 0.202862 0 0 0 1 0"
        />
        <feBlend
          mode="normal"
          in2="BackgroundImageFix"
          result="effect1_dropShadow_3001_2036"
        />
        <feBlend
          mode="normal"
          in="SourceGraphic"
          in2="effect1_dropShadow_3001_2036"
          result="shape"
        />
      </filter>
      <linearGradient
        id="paint0_linear_3001_2036"
        x1="11.9999"
        y1="25.8059"
        x2="11.9999"
        y2="-1.80583"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#8AA8B5" />
        <stop offset="1" stopColor="#DCE5E8" />
      </linearGradient>
    </defs>
  </svg>
);

export default SilverIcon;
