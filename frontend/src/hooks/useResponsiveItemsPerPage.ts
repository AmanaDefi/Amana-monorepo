import { useLayoutStore } from "@/store/store";
import { useEffect, useRef, useState } from "react";

export const useResponsiveItemsPerPageByGrid = (
  containerRef: React.RefObject<HTMLElement>,
  cardRef: React.RefObject<HTMLElement>,
) => {
  const setItemsPerPage = useLayoutStore((state) => state.setItemsPerPage);
  const lastCalculatedValue = useRef<number>(6);
  const retryCount = useRef<number>(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastWidth = useRef<number>(0);
  const [isGridReady, setIsGridReady] = useState(false);

  useEffect(() => {
    const getInitialItemsPerPage = () => {
      if (typeof window === "undefined") return 6;

      const width = window.innerWidth;
      if (width < 1280) return 6;

      if (width >= 3000) return 14;
      if (width >= 2500) return 12;
      if (width >= 2000) return 10;
      if (width >= 1805) return 8;
      return 6;
    };

    const initialValue = getInitialItemsPerPage();
    setItemsPerPage(initialValue);
    lastCalculatedValue.current = initialValue;
    console.log("Initial itemsPerPage set to:", initialValue);
  }, [setItemsPerPage]);

  useEffect(() => {
    const update = () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      const debounceDelay = isGridReady ? 200 : 50;

      debounceTimer.current = setTimeout(() => {
        if (window.innerWidth < 1280) {
          setItemsPerPageIfDifferent(6);
          retryCount.current = 0;
          return;
        }

        if (!containerRef.current || !cardRef.current) {
          if (retryCount.current < 5) {
            retryCount.current++;

            setTimeout(update, 100);
            return;
          }

          setItemsPerPageIfDifferent(lastCalculatedValue.current);
          return;
        }

        retryCount.current = 0;

        const containerWidth = containerRef.current.offsetWidth;
        const cardRect = cardRef.current.getBoundingClientRect();
        const cardWidth = cardRect.width;

        if (cardWidth === 0 || containerWidth === 0) {
          setTimeout(update, 50);
          return;
        }

        const gap = window.innerWidth >= 768 ? 16 : 24;
        const cardWithGap = cardWidth + gap;
        const columns = Math.floor((containerWidth + gap) / cardWithGap);

        const rows = window.innerWidth >= 1805 ? 2 : 2;

        let itemsPerPage = columns * rows;

        if (itemsPerPage < 6) {
          itemsPerPage = 6;
        }

        if (window.innerWidth >= 1805) {
          const maxItemsFor2Rows = columns * 2;
          if (itemsPerPage > maxItemsFor2Rows) {
            itemsPerPage = maxItemsFor2Rows;
          }

          if (itemsPerPage > 14) {
            itemsPerPage = 14;
          }
        } else {
          if (itemsPerPage > 12) {
            itemsPerPage = 12;
          }
        }

        if (columns < 2 || columns > 8) {
          itemsPerPage = lastCalculatedValue.current;
        }

        setItemsPerPageIfDifferent(itemsPerPage);

        if (!isGridReady) {
          setIsGridReady(true);
        }
      }, debounceDelay);
    };

    const setItemsPerPageIfDifferent = (newValue: number) => {
      if (newValue !== lastCalculatedValue.current) {
        setItemsPerPage(newValue);
        lastCalculatedValue.current = newValue;

        if (!isGridReady && newValue > 6) {
          setIsGridReady(true);
        }
      } else {
        console.log("itemsPerPage unchanged:", newValue);
      }
    };

    const initialDelay = 50;

    const timeoutId = setTimeout(update, initialDelay);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (Math.abs(width - (lastWidth.current || 0)) > 50) {
          retryCount.current = 0;
          setTimeout(update, 50);
          lastWidth.current = width;
          break;
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener("resize", () => {
      retryCount.current = 0;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(update, 200);
    });

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener("resize", update);
      clearTimeout(timeoutId);
    };
  }, [containerRef, cardRef, setItemsPerPage, isGridReady]);

  return { isGridReady };
};
