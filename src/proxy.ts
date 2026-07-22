import { NextRequest, NextResponse } from "next/server";

const ACCESS_COOKIE = "portal_access";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authenticated = Boolean(request.cookies.get(ACCESS_COOKIE)?.value);

  if (pathname === "/login" && authenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname !== "/login" && !authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|og.png).*)"],
};
