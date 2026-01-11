import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('backend_session')?.value;

        // Call backend logout
        if (sessionId) {
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
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
    }
}
