import React from "react";

const glowStyles = `
  .glow-icon {
    pointer-events: none;
    position: absolute;
    z-index: -1;
    border-radius: 50%;
    background: linear-gradient(90deg, #1a368f 33.64%, #1B46E0 100%);
    filter: blur(200px);
    transform: rotate(66.86deg);
  }

  .glow-icon--top-right {
    top: 80px;
    right: -500px;
    width: 433px;
    height: 600px;
  }

  .glow-icon--bottom-left {
    bottom: -300px;
    left: -220px;
    width: 433px;
    height: 600px;
  }

  .glow-icon--top-mobile {
    top: -500px;
    right: -120px;
    width: 433px;
    height: 580px;
  }

  .glow-icon--bottom-mobile {
    bottom: -300px;
    left: -220px;
    width: 433px;
    height: 580px;
  }
`;

const GlowIcon = ({
  position = "top-right",
}: {
  position?: "top-right" | "bottom-left" | "top-mobile" | "bottom-mobile";
}) => {
  React.useEffect(() => {
    if (!document.getElementById("glow-styles")) {
      const styleElement = document.createElement("style");
      styleElement.id = "glow-styles";
      styleElement.textContent = glowStyles;
      document.head.appendChild(styleElement);
    }
  }, []);

  return <div className={`glow-icon glow-icon--${position}`} />;
};

export default GlowIcon;
