import React from "react";

const RoadmapIcon: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className,
  ...props
}) => (
  <>
    {/* Mobile version */}
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

    {/* Tablet version */}
    <svg
      width="1428"
      height="201"
      viewBox="0 0 1428 201"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`hidden md:block xl:hidden ${className}`}
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

    <svg
      width="100%"
      height="201"
      viewBox="0 0 1428 201"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`hidden xl:block 2xl:hidden ${className}`}
      preserveAspectRatio="none"
      style={{ minWidth: "1428px" }}
      {...props}
    >
      <rect width="100%" height="1" fill="#1B46E0" />
      <rect y="181" width="100%" height="1" fill="#1B46E0" />

      <rect x="114" width="0.944444" height="180" fill="#1B46E0" />
      <ellipse
        cx="114"
        cy="181"
        rx="18.8889"
        ry="20"
        fill="#D9D9D9"
        fillOpacity="0.1"
      />
      <ellipse cx="114" cy="180" rx="7.55556" ry="8" fill="#1B46E0" />

      <rect x="414" width="0.944444" height="181" fill="#1B46E0" />
      <ellipse
        cx="414"
        cy="181"
        rx="18.8889"
        ry="20"
        fill="#D9D9D9"
        fillOpacity="0.1"
      />
      <ellipse cx="414" cy="180" rx="7.55556" ry="8" fill="#1B46E0" />

      <rect x="714" width="0.944444" height="181" fill="#1B46E0" />
      <ellipse
        cx="714"
        cy="181"
        rx="18.8889"
        ry="20"
        fill="#D9D9D9"
        fillOpacity="0.1"
      />
      <ellipse cx="714" cy="180" rx="7.55556" ry="8" fill="#1B46E0" />

      <rect x="1014" width="0.944444" height="181" fill="#1B46E0" />
      <ellipse
        cx="1014"
        cy="181"
        rx="18.8889"
        ry="20"
        fill="#D9D9D9"
        fillOpacity="0.1"
      />
      <ellipse cx="1014" cy="180" rx="7.55556" ry="8" fill="#1B46E0" />
    </svg>

    {/* desktop version */}
    <svg
      width="1428"
      height="201"
      viewBox="0 0 1428 201"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`hidden 2xl:block ${className}`}
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
