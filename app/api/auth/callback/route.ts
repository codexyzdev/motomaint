import { NextRequest, NextResponse } from 'next/server';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

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

    const params = new URLSearchParams();
    params.append('client_id', clientId!);
    params.append('client_secret', clientSecret!);
    params.append('redirect_uri', redirectUri);

    if (code) {
      params.append('code', code);
      params.append('grant_type', 'authorization_code');
    } else if (refresh_token) {
      params.append('refresh_token', refresh_token);
      params.append('grant_type', 'refresh_token');
    }

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokens = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: tokens.error_description || tokens.error || 'Token exchange failed' },
        { status: response.status }
      );
    }

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