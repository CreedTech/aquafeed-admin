import { NextRequest, NextResponse } from 'next/server';

// Robust backend URL resolution
const getBackendUrl = () => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
    return url.replace(/\/api\/v1\/?$/, '') + '/api/v1';
};

export async function POST(request: NextRequest) {
    const API_URL = getBackendUrl();
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

        const data = await backendResponse.json();
        return NextResponse.json(data, { status: backendResponse.status });
    } catch (error) {
        console.error('[Proxy send-otp Error]:', error);
        return NextResponse.json({ error: 'Proxy error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

