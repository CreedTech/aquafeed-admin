import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl, toJsonProxyResponse } from '@/lib/backend-proxy';

export async function POST(request: NextRequest) {
    const API_URL = getBackendApiUrl();
    try {
        const body = await request.json();

        console.log(`[Proxy POST] Forwarding verify-otp to: ${API_URL}/auth/verify-otp`);

        const backendResponse = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        // Get session cookie from backend response
        const setCookieHeader = backendResponse.headers.get('set-cookie');

        const response = await toJsonProxyResponse(backendResponse, {
            fallbackError: 'Unable to verify OTP with backend service',
        });

        // Forward the session cookie to the client
        if (setCookieHeader) {
            // Parse and set the session cookie for our domain
            const sessionId = setCookieHeader.match(/connect\.sid=([^;]+)/)?.[1];
            if (sessionId) {
                response.cookies.set('backend_session', sessionId, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 30 * 24 * 60 * 60, // 30 days
                });
            }
        }

        return response;
    } catch (error) {
        console.error('[Proxy verify-otp Error]:', error);
        return NextResponse.json({ error: 'Proxy error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
