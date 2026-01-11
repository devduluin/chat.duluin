import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth middleware function
export async function authMiddleware(req: NextRequest) {
  const token = req.cookies.get("app_token")?.value;
  const pathname = req.nextUrl.pathname;

  // Debug logging for conversation routes
  if (pathname.startsWith("/conversation")) {
    console.log("🔍 Middleware - Conversation route:", {
      pathname,
      hasToken: !!token,
      allCookies: Array.from(req.cookies.getAll()).map((c) => ({
        name: c.name,
        hasValue: !!c.value,
      })),
    });
  }

  // Public routes that don't require authentication
  const publicRoutes = [
    "/auth/signin",
    "/auth/signup",
    "/auth/logout",
    "/auth/connect",
    "/auth/google",
  ];

  // Check if the current path is a public route
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // If trying to access a public route and already authenticated, redirect to home
  if (isPublicRoute && token && pathname !== "/auth/logout") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // If no token and trying to access protected route, redirect to signin
  if (!token && !isPublicRoute) {
    const signInUrl = new URL("/auth/signin", req.url);
    // Optionally add the current path as a redirect parameter
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If authenticated or accessing public route, continue
  return NextResponse.next();
}
