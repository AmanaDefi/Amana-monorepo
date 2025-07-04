import { createThirdwebClient } from "thirdweb";

// Access the environment variable from process.env
const clientId = process.env.NEXT_PUBLIC_TEMPLATE_CLIENT_ID;

if (!clientId) {
  throw new Error("Missing NEXT_PUBLIC_TEMPLATE_CLIENT_ID in environment variables");
}

export const client = createThirdwebClient({
  clientId: clientId,
});
