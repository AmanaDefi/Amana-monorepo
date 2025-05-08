import mixpanel from "mixpanel-browser";

export const trackEvent = (
  eventName: string,
  props?: Record<string, any>
) => {
  try {
    if (typeof mixpanel?.track === "function") {
      mixpanel.track(eventName, props || {});
    } else {
      console.warn("Mixpanel not initialized yet");
    }
  } catch (e) {
    console.error("Mixpanel tracking failed:", e);
  }
};
