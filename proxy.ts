import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/customer-baru",
  "/pemenuhan-po",
  "/penagihan",
  "/data-sales",
  "/data-customer",
  "/settings",
  "/change-password",
];

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("konfirmasi_session");
  const protectedPath = protectedPrefixes.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
  if (protectedPath && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (request.nextUrl.pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
