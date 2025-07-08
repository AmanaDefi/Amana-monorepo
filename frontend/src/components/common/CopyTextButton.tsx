import { ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";
import React, { useState } from "react";
import CopyIcon from "../svg/CopyIcon";

type CopyTextButtonProps = {
  text: string;
  size?: number;
  className?: string;
};

export default function CopyTextButton(props: CopyTextButtonProps) {
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const { text, size = 16, className = "" } = props;

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
      className={`flex items-center justify-center relative z-20 p-1 rounded transition-all duration-200 hover:bg-gray-600/30 active:scale-95 ${className}`}
      onClick={handleCopyAction}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      aria-label={copiedToClipboard ? "Copied!" : "Copy to clipboard"}
      title={copiedToClipboard ? "Copied!" : "Copy to clipboard"}
    >
      {copiedToClipboard ? (
        <ClipboardDocumentCheckIcon
          width={size}
          height={size}
          className="text-green-400 transition-colors"
        />
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
