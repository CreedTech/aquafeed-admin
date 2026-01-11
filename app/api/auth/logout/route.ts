import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Robust backend URL resolution
const getBackendUrl = () => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
    return url.replace(/\/api\/v1\/?$/, '') + '/api/v1';
};

export async function POST(request: NextRequest) {
    const API_URL = getBackendUrl();
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('backend_session')?.value;

        // Call backend logout
        if (sessionId) {
            console.log(`[Proxy POST] Forwarding logout to: ${API_URL}/auth/logout`);
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Cookie': `connect.sid=${sessionId}`,
                },
            });
        }

        // Clear local session cookie
        cookieStore.delete('backend_session');

        return NextResponse.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('[Proxy logout Error]:', error);
        return NextResponse.json({ error: 'Proxy error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

