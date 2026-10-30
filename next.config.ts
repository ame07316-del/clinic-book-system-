import type { NextConfig } from "next";

/* ------------------------------------------------------------------ */
/*  رؤوس الأمان (Security Headers)                                     */
/*  تطبق على جميع استجابات التطبيق بناءً على مهارة                   */
/*  "Performing Security Headers Audit" من مستودع المهارات الأمنية     */
/* ------------------------------------------------------------------ */

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
  },
  {
    key: "X-XSS-Protection",
    value: "0",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com https://supabase.co https://*.supabase.co https://*.supabase.in https://js.stripe.com https://*.googleapis.com https://*.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com https://supabase.co https://*.supabase.co https://*.supabase.in https://js.stripe.com",
      "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com https://cdn.jsdelivr.net https://unpkg.com https://supabase.co https://*.supabase.co https://*.supabase.in https://js.stripe.com",
      "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://gravatar.com https://*.googleapis.com https://*.gstatic.com https://ui-avatars.com",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.stripe.com https://*.googleapis.com https://*.google.com wss://*.supabase.co wss://*.supabase.in",
      "frame-src 'self' https://*.supabase.co https://*.supabase.in https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.supabase.co https://*.supabase.in https://js.stripe.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
