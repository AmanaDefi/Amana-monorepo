import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_EXPONENTIAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing NEXT_PUBLIC_EXPONENTIAL_API_KEY' }, { status: 500 });
    }

    const body = await req.json();

    const res = await fetch('https://api.exponential.fi/api/pool-risk/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify(body),
      // Important: requests from server side avoid CORS and header restrictions
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json() : await res.text();

    // If upstream indicates rate limit in a 400 body, propagate 429 to the client
    const lower = JSON.stringify(data || '').toLowerCase();
    if (res.status === 400 && lower.includes('rate limit')) {
      return NextResponse.json(data, { status: 429 });
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Proxy error' }, { status: 500 });
  }
}
