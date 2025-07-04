import { useLayoutStore } from "@/store/store";
import { useEffect } from "react";

export const useResponsiveItemsPerPageByGrid = (
  containerRef: React.RefObject<HTMLElement>,
  cardRef: React.RefObject<HTMLElement>,
) => {
  const setItemsPerPage = useLayoutStore((state) => state.setItemsPerPage);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current || !cardRef.current) return;

      const containerWidth = containerRef.current.offsetWidth;
      const cardWidth = cardRef.current.getBoundingClientRect().width;

      if (cardWidth === 0) return;

      const gap = 16;
      const cardWithGap = cardWidth + gap;
      const columns = Math.floor((containerWidth + gap) / cardWithGap);
      const rows = 2;
      let itemsPerPage = columns * rows;

      if (itemsPerPage < 2) {
        itemsPerPage = 2;
      }

      console.log("Grid calculation:", {
        containerWidth,
        cardWidth,
        columns,
        rows,
        itemsPerPage,
      });

      setItemsPerPage(itemsPerPage);
    };

    const resizeObserver = new ResizeObserver(update);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const timeoutId = setTimeout(update, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, [containerRef, cardRef, setItemsPerPage]);
};
