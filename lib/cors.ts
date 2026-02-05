import { NextResponse } from 'next/server';

export function corsResponse(response: NextResponse) {
    response.headers.set('Access-Control-Allow-Origin', '*'); // Or the specific domain of akademik-app
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}

export function handleOptions() {
    const response = new NextResponse(null, { status: 204 });
    return corsResponse(response);
}
