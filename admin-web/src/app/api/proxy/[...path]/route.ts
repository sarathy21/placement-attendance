import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

async function handleProxy(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { path } = await params;
    const targetPath = path.join('/');
    const searchParams = req.nextUrl.search;
    const targetUrl = `${API_BASE_URL}/${targetPath}${searchParams}`;

    const contentType = req.headers.get('content-type');

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      cache: 'no-store',
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (contentType && contentType.includes('multipart/form-data')) {
        const arrayBuffer = await req.arrayBuffer();
        fetchOptions.body = Buffer.from(arrayBuffer);
      } else {
        const bodyText = await req.text();
        if (bodyText) {
          fetchOptions.body = bodyText;
        }
      }
    }

    const backendRes = await fetch(targetUrl, fetchOptions);
    const data = await backendRes.json().catch(() => ({}));

    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to proxy request to backend API';
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}

export const GET = handleProxy;
export const POST = handleProxy;
export const PATCH = handleProxy;
export const PUT = handleProxy;
export const DELETE = handleProxy;
