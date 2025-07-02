const BronzeIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <svg
    width="22"
    height="23"
    viewBox="0 0 22 23"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <g filter="url(#filter0_d_3001_5028)">
      <mask id="path-1-inside-1_3001_5028" fill="white">
        <path d="M0.800049 2.09922C0.800049 1.04988 1.65071 0.199219 2.70005 0.199219L19.3001 0.199219C20.3494 0.199219 21.2001 1.04988 21.2001 2.09922V12.0792C21.2001 17.4474 16.44 21.7992 11 21.7992C5.56005 21.7992 0.800049 17.4474 0.800049 12.0792V2.09922Z" />
      </mask>
      <path
        d="M0.800049 2.09922C0.800049 1.04988 1.65071 0.199219 2.70005 0.199219L19.3001 0.199219C20.3494 0.199219 21.2001 1.04988 21.2001 2.09922V12.0792C21.2001 17.4474 16.44 21.7992 11 21.7992C5.56005 21.7992 0.800049 17.4474 0.800049 12.0792V2.09922Z"
        fill="url(#paint0_linear_3001_5028)"
      />
      <path
        d="M21.2001 2.09922H19.2001V12.0792H21.2001H23.2001V2.09922H21.2001ZM0.800049 12.0792H2.80005V2.09922H0.800049H-1.19995V12.0792H0.800049ZM11 21.7992V19.7992C6.54753 19.7992 2.80005 16.2293 2.80005 12.0792H0.800049H-1.19995C-1.19995 18.6656 4.57257 23.7992 11 23.7992V21.7992ZM21.2001 12.0792H19.2001C19.2001 16.2293 15.4526 19.7992 11 19.7992V21.7992V23.7992C17.4275 23.7992 23.2001 18.6656 23.2001 12.0792H21.2001ZM2.70005 0.199219L2.70005 2.19922L19.3001 2.19922L19.3001 0.199219L19.3001 -1.80078L2.70005 -1.80078L2.70005 0.199219ZM0.800049 2.09922H2.80005C2.80005 2.15445 2.75528 2.19922 2.70005 2.19922L2.70005 0.199219L2.70005 -1.80078C0.546139 -1.80078 -1.19995 -0.0546936 -1.19995 2.09922H0.800049ZM21.2001 2.09922H23.2001C23.2001 -0.054688 21.454 -1.80078 19.3001 -1.80078L19.3001 0.199219L19.3001 2.19922C19.2448 2.19922 19.2001 2.15444 19.2001 2.09922H21.2001Z"
        fill="white"
        fill-opacity="0.4"
        mask="url(#path-1-inside-1_3001_5028)"
      />
    </g>
    <defs>
      <filter
        id="filter0_d_3001_5028"
        x="0.800049"
        y="0.199219"
        width="20.4"
        height="22.5496"
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
        <feOffset dy="0.95" />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix
          type="matrix"
          values="0 0 0 0 0.24 0 0 0 0 0.118652 0 0 0 0 0 0 0 0 1 0"
        />
        <feBlend
          mode="normal"
          in2="BackgroundImageFix"
          result="effect1_dropShadow_3001_5028"
        />
        <feBlend
          mode="normal"
          in="SourceGraphic"
          in2="effect1_dropShadow_3001_5028"
          result="shape"
        />
      </filter>
      <linearGradient
        id="paint0_linear_3001_5028"
        x1="10.9999"
        y1="26.1559"
        x2="10.9999"
        y2="0.469233"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#8C4500" />
        <stop offset="1" stopColor="#D1A66E" />
      </linearGradient>
    </defs>
  </svg>
);

export default BronzeIcon;
