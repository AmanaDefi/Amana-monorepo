export const getActiveSectionFromPathname = (
  pathname: string,
): string | undefined => {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/earn")) return "earn";
  return undefined;
};
