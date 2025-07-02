const GoldIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
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
    <g filter="url(#filter0_d_3001_234)">
      <path
        d="M14.5024 22.5608C13.0103 23.6792 10.9897 23.6792 9.49752 22.5608L2.35524 17.2073C0.863065 16.0889 0.238679 14.1063 0.80864 12.2966L3.53675 3.63457C4.10671 1.82487 5.74137 0.599609 7.58581 0.599609H16.4141C18.2586 0.599609 19.8932 1.82487 20.4632 3.63457L23.1913 12.2966C23.7613 14.1063 23.1369 16.0889 21.6447 17.2073L14.5024 22.5608Z"
        fill="url(#paint0_linear_3001_234)"
      />
      <path
        d="M7.58533 1.59961H16.4144C17.805 1.59974 19.0651 2.52514 19.5092 3.93457L22.2377 12.5967C22.6831 14.0111 22.1898 15.5493 21.0453 16.4072L13.9027 21.7607C12.766 22.6127 11.2337 22.6128 10.097 21.7607L2.95544 16.4072C1.81085 15.5493 1.3166 14.0111 1.76208 12.5967L4.4906 3.93457C4.93466 2.52517 6.19479 1.59982 7.58533 1.59961Z"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="2"
      />
    </g>
    <defs>
      <filter
        id="filter0_d_3001_234"
        x="0.599976"
        y="0.599609"
        width="22.8"
        height="23.8008"
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
          values="0 0 0 0 0.300741 0 0 0 0 0.171852 0 0 0 0 0.0192593 0 0 0 1 0"
        />
        <feBlend
          mode="normal"
          in2="BackgroundImageFix"
          result="effect1_dropShadow_3001_234"
        />
        <feBlend
          mode="normal"
          in="SourceGraphic"
          in2="effect1_dropShadow_3001_234"
          result="shape"
        />
      </filter>
      <linearGradient
        id="paint0_linear_3001_234"
        x1="12.0003"
        y1="24.4364"
        x2="12.0003"
        y2="-1.91695"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#F07E00" />
        <stop offset="1" stopColor="#F7F4CF" />
      </linearGradient>
    </defs>
  </svg>
);

export default GoldIcon;
