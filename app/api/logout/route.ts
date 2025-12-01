import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.json({ message: "Logged out" });

  // Clear cookies (set expiration in the past)
  response.cookies.set("authToken", "", { expires: new Date(0), path: "/" });

  return response;
}