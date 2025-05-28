import mixpanel from "mixpanel-browser";

let isInitialized = false;

const initMixpanel = async () => {
  if (isInitialized) return;

    await new Promise(resolve => setTimeout(resolve, 0));
  
  try {
    mixpanel.init("1f01d05893463c7ba9d4ac7280821010", {
      debug: true,
      persistence: "localStorage",
    });
    isInitialized = true;
  } catch (e) {
    console.error("Mixpanel initialization failed:", e);
  }
};

export const trackEvent = async (
  eventName: string,
  props?: Record<string, any>
) => {
  try {

    await initMixpanel();
    
    if (typeof mixpanel?.track === "function") {
      mixpanel.track(eventName, props || {});
    } else {
      console.warn("Mixpanel not initialized yet");
    }
  } catch (e) {
    console.error("Mixpanel tracking failed:", e);
  }
};

export const identifyUser = async (walletAddress: string) => {
  try {
    await initMixpanel();
    
    if (typeof mixpanel?.identify === "function") {
      mixpanel.identify(walletAddress);
      mixpanel.people.set({
        wallet_address: walletAddress,
      });
    }
  } catch (e) {
    console.error("Mixpanel identify failed:", e);
  }
};

export const trackPageView = async (route: string, walletAddress?: string) => {
  const page =
    route === "/" ? "Vaults List" :
    route.startsWith("/vaults/") ? "Vault Details" :
    route === "/about" ? "About" :
    route === "/leaderboard" ? "Leaderboard" :
    route === "/roadmap" ? "Roadmap" :
    route;

  await trackEvent("Page Viewed", {
    page,
    route,
    isWalletConnected: !!walletAddress,
    walletAddress: walletAddress || null,
  });
};

export const trackWalletConnection = async (walletAddress: string) => {
  await trackEvent("Wallet Connected", {
    walletAddress,
  });
};