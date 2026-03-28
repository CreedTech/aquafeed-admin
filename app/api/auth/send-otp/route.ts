import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiUrl, toJsonProxyResponse } from '@/lib/backend-proxy';

export async function POST(request: NextRequest) {
    const API_URL = getBackendApiUrl();
    try {
        const body = await request.json();

        console.log(`[Proxy POST] Forwarding send-otp to: ${API_URL}/auth/request-otp`);

        const backendResponse = await fetch(`${API_URL}/auth/request-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        return toJsonProxyResponse(backendResponse, {
            fallbackError: 'Unable to request OTP from backend service',
        });
    } catch (error) {
        console.error('[Proxy send-otp Error]:', error);
        return NextResponse.json({ error: 'Proxy error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
