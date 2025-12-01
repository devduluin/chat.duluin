import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { workspaceUrl } from "@/utils/urlConfig";

// Auth middleware function
export async function authMiddleware(req: NextRequest) {
  const token = req.cookies.get("app_token")?.value;

  // If no token and path starts with /forms, redirect to signin
  if (!token && req.nextUrl.pathname.startsWith("/forms")) {
    // localStorage.removeItem('account-store');
    return NextResponse.redirect(new URL("/", req.url));
    
    // Use workspaceUrl to build the redirect target
    // const redirectUrl = new URL(workspaceUrl('/auth/signin'));
    // redirectUrl.searchParams.set('redirect', req.nextUrl.href);

    // return NextResponse.redirect(redirectUrl);
  }

  // If authenticated or not matching path, continue
  return NextResponse.next();
}
