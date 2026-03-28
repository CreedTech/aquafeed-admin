import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getBackendApiUrl, toJsonProxyResponse } from '@/lib/backend-proxy';

export async function GET() {
    const API_URL = getBackendApiUrl();
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('backend_session')?.value;

        if (!sessionId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        console.log(`[Proxy GET] Forwarding auth/me to: ${API_URL}/auth/me`);

        const backendResponse = await fetch(`${API_URL}/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `connect.sid=${sessionId}`,
            },
        });

        return toJsonProxyResponse(backendResponse, {
            fallbackError: 'Unable to fetch authenticated user from backend service',
        });
    } catch (error) {
        console.error('[Proxy auth/me Error]:', error);
        return NextResponse.json({ error: 'Proxy error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
