import React from "react";

const RoadmapIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <>
    <svg
      width="768"
      height="201"
      viewBox="0 0 768 201"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`md:hidden ${className}`}
      {...props}
    >
      <rect width="768" height="1" fill="#1B46E0" />
      <rect y="181" width="768" height="1" fill="#1B46E0" />

      <rect x="239" width="0.944444" height="180" fill="#1B46E0" />
      <ellipse
        cx="239"
        cy="181"
        rx="18.8889"
        ry="20"
        fill="#D9D9D9"
        fillOpacity="0.1"
      />
      <ellipse cx="239" cy="180" rx="7.55556" ry="8" fill="#1B46E0" />

      <rect x="529" width="0.944444" height="181" fill="#1B46E0" />
      <ellipse
        cx="529"
        cy="181"
        rx="18.8889"
        ry="20"
        fill="#D9D9D9"
        fillOpacity="0.1"
      />
      <ellipse cx="529" cy="180" rx="7.55556" ry="8" fill="#1B46E0" />
    </svg>

    <svg
      width="1428"
      height="201"
      viewBox="0 0 1428 201"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`hidden md:block ${className}`}
      {...props}
    >
      <rect width="1428" height="1" fill="#1B46E0" />
      <rect y="181" width="1428" height="1" fill="#1B46E0" />
      <rect x="56.6667" width="0.944444" height="180" fill="#1B46E0" />
      <ellipse
        cx="56.6666"
        cy="181"
        rx="18.8889"
        ry="20"
        fill="#D9D9D9"
        fillOpacity="0.1"
      />
      <ellipse cx="56.6668" cy="180" rx="7.55556" ry="8" fill="#1B46E0" />
      <rect x="396.667" width="0.944444" height="181" fill="#1B46E0" />
      <ellipse
        cx="396.667"
        cy="181"
        rx="18.8889"
        ry="20"
        fill="#D9D9D9"
        fillOpacity="0.1"
      />
      <ellipse cx="396.667" cy="180" rx="7.55556" ry="8" fill="#1B46E0" />
      <rect x="736.667" width="0.944444" height="181" fill="#1B46E0" />
      <ellipse
        cx="736.667"
        cy="181"
        rx="18.8889"
        ry="20"
        fill="#D9D9D9"
        fillOpacity="0.1"
      />
      <ellipse cx="736.667" cy="180" rx="7.55556" ry="8" fill="#1B46E0" />
      <rect x="1076.67" width="0.944444" height="181" fill="#1B46E0" />
      <ellipse
        cx="1076.67"
        cy="181"
        rx="18.8889"
        ry="20"
        fill="#D9D9D9"
        fillOpacity="0.1"
      />
      <ellipse cx="1076.67" cy="180" rx="7.55556" ry="8" fill="#1B46E0" />
    </svg>
  </>
);

export default RoadmapIcon;
