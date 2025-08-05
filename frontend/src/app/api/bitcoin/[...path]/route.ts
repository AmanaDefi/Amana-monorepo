import { NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `https://blockstream.info/api/${path}${req.nextUrl.search ? req.nextUrl.search : ""}`;

  // Forward headers if needed (e.g., for Blockstream rate limiting)
  const headers: Record<string, string> = {};
  if (req.headers.get("authorization")) {
    headers["authorization"] = req.headers.get("authorization")!;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  // Forward status and content-type
  const contentType = response.headers.get("content-type") || "application/json";
  const body = await response.arrayBuffer();

  return new Response(body, {
    status: response.status,
    headers: {
      "content-type": contentType,
      "access-control-allow-origin": "*", // For local dev, you can restrict in prod
    },
  });
}

// Optionally, add POST handler for broadcasting txs
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join("/");
  const url = `https://blockstream.info/api/${path}${req.nextUrl.search ? req.nextUrl.search : ""}`;
  const body = await req.text();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "text/plain",
    },
    body,
  });

  const contentType = response.headers.get("content-type") || "text/plain";
  const respBody = await response.arrayBuffer();

  return new Response(respBody, {
    status: response.status,
    headers: {
      "content-type": contentType,
      "access-control-allow-origin": "*",
    },
  });
}