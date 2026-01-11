import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('backend_session')?.value;

        const url = new URL(request.url);
        const queryString = url.search;
        const apiPath = path.join('/');

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (sessionId) {
            headers['Cookie'] = `connect.sid=${sessionId}`;
        }

        const backendResponse = await fetch(`${API_URL}/${apiPath}${queryString}`, {
            method: 'GET',
            headers,
        });

        const data = await backendResponse.json();
        return NextResponse.json(data, { status: backendResponse.status });
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('backend_session')?.value;

        const apiPath = path.join('/');
        const body = await request.json();

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (sessionId) {
            headers['Cookie'] = `connect.sid=${sessionId}`;
        }

        const backendResponse = await fetch(`${API_URL}/${apiPath}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        const data = await backendResponse.json();
        return NextResponse.json(data, { status: backendResponse.status });
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('backend_session')?.value;

        const apiPath = path.join('/');
        const body = await request.json();

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (sessionId) {
            headers['Cookie'] = `connect.sid=${sessionId}`;
        }

        const backendResponse = await fetch(`${API_URL}/${apiPath}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
        });

        const data = await backendResponse.json();
        return NextResponse.json(data, { status: backendResponse.status });
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path } = await params;
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('backend_session')?.value;

        const apiPath = path.join('/');

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (sessionId) {
            headers['Cookie'] = `connect.sid=${sessionId}`;
        }

        const backendResponse = await fetch(`${API_URL}/${apiPath}`, {
            method: 'DELETE',
            headers,
        });

        const data = await backendResponse.json();
        return NextResponse.json(data, { status: backendResponse.status });
    } catch (error) {
        console.error('Proxy error:', error);
        return NextResponse.json({ error: 'Proxy error' }, { status: 500 });
    }
}
