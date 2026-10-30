/* ------------------------------------------------------------------ */
/*  وسيط Next.js — CORS، تقييد المعدل، ورؤوس أمان إضافية                 */
/*  مبني على مهارات: testing-cors-misconfiguration،                   */
/*  implementing-api-rate-limiting-and-throttling                       */
/* ------------------------------------------------------------------ */

import { NextResponse, type NextRequest } from "next/server";

/* ------------------------------------------------------------------ */
/*  تقييد المعدل بسيط في الذاكرة (للتجربة)                             */
/*  في الإنتاج يُستبدل بـ Redis أو خدمة معدل مركزية                   */
/* ------------------------------------------------------------------ */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function getRateLimitKey(
  identifier: string,
  endpoint: string,
  windowMs: number,
): string {
  const windowBucket = Math.floor(Date.now() / windowMs);
  return `${identifier}:${endpoint}:${windowBucket}`;
}

function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetIn: number } {
  const key = getRateLimitKey(identifier, endpoint, windowMs);
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  rateLimitStore.set(key, entry);
  return { allowed: true, remaining: maxRequests - entry.count, resetIn: entry.resetTime - now };
}

/* ------------------------------------------------------------------ */
/*  مسار الحجز والتسجيل — تقييد صارم (max 10 طلبات في الدقيقة)          */
/* ------------------------------------------------------------------ */

const BOOKING_LIMIT = { max: 10, windowMs: 60_000 }; // 10 req/min per IP

/* ------------------------------------------------------------------ */
/*  نطاقات أصل موثوقة (CORS allowlist)                                  */
/*  لا نعكس أي Origin arbitrarty — فقط نطاقات محددة                   */
/* ------------------------------------------------------------------ */

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  process.env.NEXT_PUBLIC_APP_URL ?? "",
].filter(Boolean));

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  /* ---------- CORS preflight ---------- */
  if (request.method === "OPTIONS") {
    if (!origin || !isOriginAllowed(origin)) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Requested-With, Accept, Origin",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "600",
      },
    });
  }

  /* ---------- تقييد المعدل على مسارات الحجز ---------- */
  if (pathname.startsWith("/api/booking") || pathname.includes("/book")) {
    const { allowed, remaining, resetIn } = checkRateLimit(
      ip,
      pathname,
      BOOKING_LIMIT.max,
      BOOKING_LIMIT.windowMs,
    );

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "rate_limit_exceeded",
          message: "تم تجاوز عدد الطلبات المسموح. من فضلك انتظر وحاول مرة أخرى.",
          retry_after: Math.ceil(resetIn / 1000),
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil(resetIn / 1000).toString(),
            "X-RateLimit-Limit": BOOKING_LIMIT.max.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(resetIn / 1000).toString(),
          },
        },
      );
    }

    const response = NextResponse.next();
    response.headers.set(
      "X-RateLimit-Limit",
      BOOKING_LIMIT.max.toString(),
    );
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", Math.ceil(resetIn / 1000).toString());
    return response;
  }

  /* ---------- رؤوس CORS على الاستجابات العادية ---------- */
  if (origin && isOriginAllowed(origin)) {
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Vary", "Origin");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/reception/:path*",
    "/admin/:path*",
    "/doctor/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
