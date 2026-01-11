import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const backendResponse = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await backendResponse.json();

        // Get session cookie from backend response
        const setCookieHeader = backendResponse.headers.get('set-cookie');

        const response = NextResponse.json(data, { status: backendResponse.status });

        // Forward the session cookie to the client
        if (setCookieHeader) {
            // Parse and set the session cookie for our domain
            const cookieStore = await cookies();
            const sessionId = setCookieHeader.match(/connect\.sid=([^;]+)/)?.[1];
            if (sessionId) {
                cookieStore.set('backend_session', sessionId, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 30 * 24 * 60 * 60, // 30 days
                });
            }
        }

        return response;
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
    }
}
