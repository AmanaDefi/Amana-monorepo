import React from "react";

interface Props {
  className?: string;
  color?: string;
}

const PointsIcon: React.FC<Props> = ({ className = "w-4 h-4", color = "#06afbc" }) => {
  return (
    <svg width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.1579 0L8.62006 2.74173C9.03343 5.19393 11.0004 7.11591 13.5099 7.51982L16.3158 7.97143L13.5099 8.42303C11.0004 8.82695 9.03343 10.7489 8.62006 13.2011L8.1579 15.9429L7.69573 13.2011C7.28236 10.7489 5.31543 8.82695 2.80586 8.42303L0 7.97143L2.80586 7.51982C5.31543 7.11591 7.28236 5.19393 7.69573 2.74173L8.1579 0Z" fill="url(#paint0_linear_1716_12320)"/>
    <path d="M12.8948 13.3711L13.029 14.1671C13.149 14.879 13.72 15.437 14.4486 15.5543L15.2632 15.6854L14.4486 15.8165C13.72 15.9338 13.149 16.4917 13.029 17.2037L12.8948 17.9997L12.7606 17.2037C12.6406 16.4917 12.0696 15.9338 11.341 15.8165L10.5264 15.6854L11.341 15.5543C12.0696 15.437 12.6406 14.879 12.7606 14.1671L12.8948 13.3711Z" fill="url(#paint1_linear_1716_12320)"/>
    <path d="M17.1052 8.74316L17.2692 9.80448C17.4159 10.7537 18.1138 11.4977 19.0043 11.6541L19.9999 11.8289L19.0043 12.0037C18.1138 12.16 17.4159 12.904 17.2692 13.8533L17.1052 14.9146L16.9412 13.8533C16.7945 12.904 16.0966 12.16 15.2061 12.0037L14.2104 11.8289L15.2061 11.6541C16.0966 11.4977 16.7945 10.7537 16.9412 9.80448L17.1052 8.74316Z" fill="url(#paint2_linear_1716_12320)"/>
    <defs>
    <linearGradient id="paint0_linear_1716_12320" x1="6.76484" y1="-20.2093" x2="29.0069" y2="-1.94085" gradientUnits="userSpaceOnUse">
    <stop offset="0.309977" stop-color="#F6FAFF"/>
    <stop offset="0.841346" stop-color="#1B46E0"/>
    </linearGradient>
    <linearGradient id="paint1_linear_1716_12320" x1="12.4904" y1="7.50389" x2="18.9477" y2="12.8076" gradientUnits="userSpaceOnUse">
    <stop offset="0.309977" stop-color="#F6FAFF"/>
    <stop offset="0.841346" stop-color="#1B46E0"/>
    </linearGradient>
    <linearGradient id="paint2_linear_1716_12320" x1="16.6109" y1="0.920226" x2="25.046" y2="7.271" gradientUnits="userSpaceOnUse">
    <stop offset="0.309977" stop-color="#F6FAFF"/>
    <stop offset="0.841346" stop-color="#1B46E0"/>
    </linearGradient>
    </defs>
    </svg>
  );
};

export default PointsIcon; 