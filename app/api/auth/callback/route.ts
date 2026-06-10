import { NextRequest, NextResponse } from 'next/server';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface TokenRequest {
  code?: string;
  refresh_token?: string;
  grant_type: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, refresh_token } = body;

    if (!code && !refresh_token) {
      return NextResponse.json(
        { message: 'Missing code or refresh_token' },
        { status: 400 }
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'http://localhost:3000';

    const tokenRequest: TokenRequest = {
      client_id: clientId!,
      client_secret: clientSecret!,
      redirect_uri: redirectUri,
      grant_type: code ? 'authorization_code' : 'refresh_token',
      ...(code ? { code } : { refresh_token }),
    };

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(tokenRequest as unknown as Record<string, string>),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { message: error.error_description || 'Token exchange failed' },
        { status: response.status }
      );
    }

    const tokens = await response.json();

    if (refresh_token && !tokens.refresh_token) {
      tokens.refresh_token = refresh_token;
    }

    tokens.issued_at = Date.now();

    return NextResponse.json(tokens);
  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}