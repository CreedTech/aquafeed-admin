import { NextResponse } from 'next/server';

export const getBackendApiUrl = () => {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';
    return url.replace(/\/api\/v1\/?$/, '') + '/api/v1';
};

const sanitizeUpstreamText = (value: string) => {
    return value
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const safeParseUpstreamBody = async (response: globalThis.Response) => {
    const contentType = response.headers.get('content-type') || '';
    const raw = await response.text();
    const trimmed = raw.trim();

    if (!trimmed) {
        return {
            payload: null as unknown,
            raw: '',
            contentType,
        };
    }

    if (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
            return {
                payload: JSON.parse(trimmed) as unknown,
                raw: trimmed,
                contentType,
            };
        } catch {
            // Fall through to plain-text normalization.
        }
    }

    return {
        payload: null as unknown,
        raw: trimmed,
        contentType,
    };
};

export const toJsonProxyResponse = async (
    backendResponse: globalThis.Response,
    options?: {
        successKey?: 'message' | 'data';
        fallbackError?: string;
    }
) => {
    const { payload, raw } = await safeParseUpstreamBody(backendResponse);
    const fallbackError = options?.fallbackError || 'Upstream service unavailable';
    const successKey = options?.successKey || 'message';

    if (payload !== null) {
        return NextResponse.json(payload, { status: backendResponse.status });
    }

    const normalizedText = sanitizeUpstreamText(raw);
    if (backendResponse.ok) {
        return NextResponse.json(
            { [successKey]: normalizedText || 'Request completed successfully' },
            { status: backendResponse.status }
        );
    }

    return NextResponse.json(
        {
            error: normalizedText || fallbackError,
            upstreamStatus: backendResponse.status
        },
        { status: backendResponse.status }
    );
};
