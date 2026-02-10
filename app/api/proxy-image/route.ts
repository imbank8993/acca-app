import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ ok: false, error: 'URL is required' }, { status: 400 });
    }

    try {
        console.log('Proxying image fetch for:', url);
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`External fetch failed with status ${res.status}`);
        }

        const blob = await res.blob();
        const headers = new Headers();

        // Forward the content type or fallback to image/png
        headers.set('Content-Type', res.headers.get('Content-Type') || 'image/png');
        headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

        return new NextResponse(blob, {
            status: 200,
            headers,
        });
    } catch (error: any) {
        console.error('Proxy Image Error:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
