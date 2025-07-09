import React, { useState } from "react";
import CopyIcon from "../svg/CopyIcon";

type CopyTextButtonProps = {
  text: string;
  size?: number;
  className?: string;
  showTextFeedback?: boolean;
};

export default function CopyTextButton(props: CopyTextButtonProps) {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const { text, size = 16, className = "", showTextFeedback = false } = props;

  const handleCopyAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    try {
      await navigator.clipboard.writeText(text);
      setCopiedToClipboard(true);

      setTimeout(() => {
        setCopiedToClipboard(false);
      }, 2000);
    } catch (err) {
      console.log("Failed to copy text:", err);
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopiedToClipboard(true);
        setTimeout(() => setCopiedToClipboard(false), 2000);
      } catch (fallbackErr) {
        console.log("Fallback copy failed:", fallbackErr);
      }
    }
  };

  return (
    <button
      className={`flex items-center justify-center relative z-20 p-1 transition-transform hover:scale-105 active:scale-95 ${className}`}
      onClick={handleCopyAction}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      aria-label={copiedToClipboard ? "Copied!" : "Copy to clipboard"}
      title={copiedToClipboard ? "Copied!" : "Copy to clipboard"}
    >
      {showTextFeedback && copiedToClipboard ? (
        <span className="text-green-400 font-bold text-xs md:text-base animate-pulse">
          ✓
        </span>
      ) : (
        <CopyIcon
          width={size}
          height={size}
          className="text-gray-400 hover:text-white transition-colors"
        />
      )}
    </button>
  );
}
