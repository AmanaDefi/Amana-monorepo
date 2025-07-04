import { createThirdwebClient } from "thirdweb";

// Access the environment variable from process.env
const clientId = process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID;

if (!clientId) {
  throw new Error("Missing NEXT_PUBLIC_TEMPLATE_CLIENT_ID in environment variables");
}

export const client = createThirdwebClient({
  clientId: clientId,
});

// Debug function to check client configuration
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[ThirdWeb Client Debug] Client initialized');
}


