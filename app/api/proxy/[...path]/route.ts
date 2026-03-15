import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Robust backend URL resolution
const getBackendUrl = () => {
    // Priority: 1. BACKEND_URL, 2. NEXT_PUBLIC_API_URL, 3. fallback
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
    // Ensure we don't have double /api/v1 if both env vars are used differently
    return url.replace(/\/api\/v1\/?$/, '') + '/api/v1';
};

const safeParseRequestJson = async (request: NextRequest) => {
    const raw = await request.text();
    if (!raw || raw.trim().length === 0) {
        return null;
    }

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const safeParseBackendResponse = async (response: globalThis.Response) => {
    const contentType = response.headers.get('content-type') || '';
    const raw = await response.text();

    if (!raw || raw.trim().length === 0) {
        return null;
    }

    if (contentType.includes('application/json')) {
        try {
            return JSON.parse(raw);
        } catch {
            return { raw };
        }
    }

    return { raw };
};

const forwardBackendResponse = async (backendResponse: globalThis.Response) => {
    const contentType = backendResponse.headers.get('content-type') || '';
    const contentDisposition = backendResponse.headers.get('content-disposition');

    if (contentType.includes('application/json')) {
        const data = await safeParseBackendResponse(backendResponse);
        return NextResponse.json(data, { status: backendResponse.status });
    }

    const raw = await backendResponse.arrayBuffer();
    const headers = new Headers();
    if (contentType) headers.set('Content-Type', contentType);
    if (contentDisposition) {
        headers.set('Content-Disposition', contentDisposition);
    }
    return new NextResponse(raw, {
        status: backendResponse.status,
        headers,
    });
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const API_URL = getBackendUrl();
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

        console.log(`[Proxy GET] Forwarding to: ${API_URL}/${apiPath}${queryString}`);

        const backendResponse = await fetch(`${API_URL}/${apiPath}${queryString}`, {
            method: 'GET',
            headers,
        });

        return forwardBackendResponse(backendResponse);
    } catch (error) {
        console.error('[Proxy GET Error]:', error);
        return NextResponse.json({ error: 'Proxy error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const API_URL = getBackendUrl();
    try {
        const { path } = await params;
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('backend_session')?.value;

        const apiPath = path.join('/');
        const body = await safeParseRequestJson(request);

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (sessionId) {
            headers['Cookie'] = `connect.sid=${sessionId}`;
        }

        console.log(`[Proxy POST] Forwarding to: ${API_URL}/${apiPath}`);

        const backendResponse = await fetch(`${API_URL}/${apiPath}`, {
            method: 'POST',
            headers,
            ...(body !== null ? { body: JSON.stringify(body) } : {}),
        });

        return forwardBackendResponse(backendResponse);
    } catch (error) {
        console.error('[Proxy POST Error]:', error);
        return NextResponse.json({ error: 'Proxy error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const API_URL = getBackendUrl();
    try {
        const { path } = await params;
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('backend_session')?.value;

        const apiPath = path.join('/');
        const body = await safeParseRequestJson(request);

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (sessionId) {
            headers['Cookie'] = `connect.sid=${sessionId}`;
        }

        console.log(`[Proxy PUT] Forwarding to: ${API_URL}/${apiPath}`);

        const backendResponse = await fetch(`${API_URL}/${apiPath}`, {
            method: 'PUT',
            headers,
            ...(body !== null ? { body: JSON.stringify(body) } : {}),
        });

        return forwardBackendResponse(backendResponse);
    } catch (error) {
        console.error('[Proxy PUT Error]:', error);
        return NextResponse.json({ error: 'Proxy error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const API_URL = getBackendUrl();
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

        console.log(`[Proxy DELETE] Forwarding to: ${API_URL}/${apiPath}`);

        const backendResponse = await fetch(`${API_URL}/${apiPath}`, {
            method: 'DELETE',
            headers,
        });

        return forwardBackendResponse(backendResponse);
    } catch (error) {
        console.error('[Proxy DELETE Error]:', error);
        return NextResponse.json({ error: 'Proxy error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const API_URL = getBackendUrl();
    try {
        const { path } = await params;
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('backend_session')?.value;

        const apiPath = path.join('/');
        const body = await safeParseRequestJson(request);

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (sessionId) {
            headers['Cookie'] = `connect.sid=${sessionId}`;
        }

        console.log(`[Proxy PATCH] Forwarding to: ${API_URL}/${apiPath}`);

        const backendResponse = await fetch(`${API_URL}/${apiPath}`, {
            method: 'PATCH',
            headers,
            ...(body !== null ? { body: JSON.stringify(body) } : {}),
        });

        return forwardBackendResponse(backendResponse);
    } catch (error) {
        console.error('[Proxy PATCH Error]:', error);
        return NextResponse.json({ error: 'Proxy error', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
    }
}
