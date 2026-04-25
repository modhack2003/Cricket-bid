import { NextResponse } from "next/server";

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("mk_session");

  let role = null;
  if (session) {
    try {
      const payload = JSON.parse(
        Buffer.from(session.value, "base64").toString("utf-8")
      );
      role = payload.role;
    } catch {}
  }

  // Admin routes
  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/login?role=admin&redirect=" + pathname, request.url));
    }
  }

  // Team routes
  if (pathname.startsWith("/team")) {
    if (role !== "team1" && role !== "team2") {
      return NextResponse.redirect(new URL("/login?role=team&redirect=" + pathname, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/team/:path*"],
};
