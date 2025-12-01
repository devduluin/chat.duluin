import type { NextRequest } from "next/server";
import { authMiddleware } from "./middleware/authMiddleware";

export function middleware(req: NextRequest) {
   
  return authMiddleware(req); // Use auth middleware
}

export const config = {
  matcher: ["/forms/:path*"], // Protect dashboard
};
