import { NextResponse, type NextRequest } from "next/server";

/** Expose the request path to server layouts (for login ?next= redirects). */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  headers.set("x-pathname", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/admin/:path*", "/business/:path*", "/community/:path*"],
};
