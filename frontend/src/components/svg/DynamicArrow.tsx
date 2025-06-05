import React from "react";

interface Props {
  color?: string;
}
const DynamicArrowIcon: React.FC<Props> = ({ color = "#05D47F" }) => {
  return (
    <svg
      width="16"
      height="17"
      viewBox="0 0 16 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke={color}
    >
      <path
        d="M3.33301 12.9266L7.17501 9.0846C7.28288 8.97555 7.41131 8.88898 7.55287 8.8299C7.69442 8.77082 7.84629 8.7404 7.99967 8.7404C8.15306 8.7404 8.30493 8.77082 8.44648 8.8299C8.58804 8.88898 8.71647 8.97555 8.82434 9.0846L12.6663 12.9266M3.33301 8.25993L7.17501 4.41793C7.28288 4.30889 7.41131 4.22232 7.55287 4.16323C7.69442 4.10415 7.84629 4.07373 7.99967 4.07373C8.15306 4.07373 8.30493 4.10415 8.44648 4.16323C8.58804 4.22232 8.71647 4.30889 8.82434 4.41793L12.6663 8.25993"
        stroke={color}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
};

export default DynamicArrowIcon;
