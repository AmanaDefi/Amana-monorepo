"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DropdownArrowIcon from "@/components/svg/DropdownArrowIcon";
import {
  NEWS_BULLETS,
  NEWS_FOOTER,
  NEWS_HEADING,
  NEWS_LOCALSTORAGE_OPEN_KEY,
  NEWS_LOCALSTORAGE_SEEN_KEY,
  NEWS_PARAGRAPHS,
  NEWS_TITLE,
  NEWS_VERSION,
} from "@/constants/news";

// Centered, dismissible news banner that opens by default for a new version
// - Click on the pill or chevron toggles open/close
// - Clicking outside or pressing Escape closes
// - Remembers seen version; new version opens again automatically

export const NewsBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Always open on first render of each app load
  useEffect(() => {
    setIsOpen(true);
    if (typeof window !== "undefined") {
      try {
        const seen = localStorage.getItem(NEWS_LOCALSTORAGE_SEEN_KEY);
        if (seen !== NEWS_VERSION) {
          localStorage.setItem(NEWS_LOCALSTORAGE_SEEN_KEY, NEWS_VERSION);
        }
      } catch {}
    }
  }, []);

  // Do not persist open/close across page reloads; keep open on every load
  const persistOpen = useCallback((_: boolean) => {}, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      persistOpen(!prev);
      return !prev;
    });
  }, [persistOpen]);

  // Outside click and Escape handling
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!isOpen) return;
      const node = containerRef.current;
      if (node && !node.contains(e.target as Node)) {
        setIsOpen(false);
        persistOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        setIsOpen(false);
        persistOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, persistOpen]);

  const chevronClass = useMemo(
    () =>
      `transition-transform duration-200 ${
        isOpen ? "rotate-180" : "rotate-0"
      }`,
    [isOpen],
  );

  return (
    <div className="pointer-events-none fixed left-1/2 top-0 z-[60] -translate-x-1/2 w-full flex justify-center px-3 sm:px-4">
      <div ref={containerRef} className="pointer-events-auto">
        {/* Collapsed pill / trigger */}
        <button
          onClick={toggle}
          aria-expanded={isOpen}
          aria-controls="amana-news-panel"
          className="mx-auto flex items-center gap-2 rounded-b-lg bg-[#1B46E0] text-white px-4 py-2 shadow-md before-gradient-border"
        >
          <span className="font-gotham text-sm sm:text-base font-medium">
            {NEWS_HEADING}
          </span>
          <DropdownArrowIcon className={chevronClass} />
        </button>

        {/* Expanded panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              id="amana-news-panel"
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 10, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="mt-2 sm:mt-3 w-[92vw] max-w-[820px] rounded-[16px] bg-[#1B46E0] text-white shadow-xl before-gradient-border p-4 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <h3 className="font-gotham font-bold text-base sm:text-lg">
                    {NEWS_TITLE}
                  </h3>
                </div>
                <button
                  onClick={toggle}
                  aria-label="Close news"
                  className="rounded-md hover:bg-white/10 active:bg-white/20 p-1"
                >
                  <DropdownArrowIcon className="rotate-180" />
                </button>
              </div>

              <div className="mt-3 space-y-2 text-sm sm:text-[15px] leading-relaxed">
                {NEWS_PARAGRAPHS.map((p, idx) => (
                  <p key={idx}>{p}</p>
                ))}
                {NEWS_BULLETS.length > 0 && (
                  <ul className="list-disc pl-5 space-y-1">
                    {NEWS_BULLETS.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
                {!!NEWS_FOOTER && (
                  <p className="pt-2 whitespace-pre-line opacity-90 text-[13px] sm:text-[14px]">
                    {NEWS_FOOTER}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NewsBanner;


