# 2025-05-12 — Banner Carousel Refactor

## Author: Rohit Kumar Suman
## Date: 12-05-2025

## Summary

- Refactored the hero banner into three card-like UI blocks displayed side-by-side on desktop and stacked on mobile
- Introduced two new static banners and one dynamic carousel banner:
  - **StaticBanner1**: "Join our Community" with X, Telegram & Discord links
  - **StaticBanner2**: "Deposit from any connected chain" with a tooltip (via `WithTooltip`) and a set of chain logos (ZetaChain, Ethereum, Base, Binance, Polygon, Avalanche, Arbitrum)
  - **CarouselBannerX**: Three rotating slides with updated copy and branding
- Replaced all raw `<img>` tags with Next.js `<Image>` component (using `fill` or explicit `width`/`height`) to optimize LCP and bandwidth
- Swapped the custom tooltip implementation in banners for the app's existing `ResponsiveTooltip`/`WithTooltip` for consistent branding
- Extended Tailwind configuration:
  - Added an `xs` (480px) breakpoint
  - Tuned container heights (`h-[140px] xs:h-[160px] sm:h-[176px]`), padding, and font sizes across breakpoints

## Files Changed

- `frontend/src/components/banners/BannersCarousel.tsx`
- `frontend/tailwind.config.ts`

---

*End of notes.* 