import mixpanel from "mixpanel-browser";

// Helper function to recursively convert BigInt values to strings
const serializeBigInts = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInts);
  }
  
  if (typeof obj === 'object') {
    const serialized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeBigInts(value);
    }
    return serialized;
  }
  
  return obj;
};

export const trackEvent = (
  eventName: string,
  props?: Record<string, any>
) => {
  try {
    if (typeof mixpanel?.track === "function") {
      // Serialize BigInt values before passing to Mixpanel
      const serializedProps = props ? serializeBigInts(props) : {};
      mixpanel.track(eventName, serializedProps);
    } else {
      console.warn("Mixpanel not initialized yet");
    }
  } catch (e) {
    console.error("Mixpanel tracking failed:", e);
  }
};
