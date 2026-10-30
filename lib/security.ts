/* ------------------------------------------------------------------ */
/*  seguridad — التحقق، التنظيف، والحماية البسيطة للواجهة الأمامية     */
/*  (نظام تجريبي: الحماية من جهة الخادم تُنفَّذ عبر RLS في Supabase)   */
/* ------------------------------------------------------------------ */

/** أنماط التحقق المدعومة — pattern يمكن أن يكون RegExp أو دالة تحقق مخصصة */
export type ValidationRule = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | ((value: string) => boolean);
  message?: string;
};

/** نتيجة التحقق */
export type ValidationResult = {
  valid: boolean;
  errors: Record<string, string>;
};

/** 숫자 الهاتف المصري: يبدأ بـ +20 أو 0 ثم 10/11/12/15 و 8 أرقام */
export const EGYPTIAN_PHONE_REGEX = /^(\+20|0)?1[0125][0-9]{8}$/;

/** تنسيق رقم الهاتف المصري للعرض: +20 1xx xxx xxxx */
export function formatEgPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  let normalized = digits.startsWith("20") ? digits : digits.startsWith("0") ? "20" + digits.slice(1) : digits;
  if (!normalized.startsWith("20")) normalized = "20" + normalized;
  // +20 1xx xxx xxxx
  if (normalized.length >= 12) {
    return `+20 ${normalized.slice(2, 5)} ${normalized.slice(5, 8)} ${normalized.slice(8, 12)}`;
  }
  if (normalized.length >= 9) {
    return `+20 ${normalized.slice(2, 5)} ${normalized.slice(5)}`;
  }
  return `+20 ${normalized.slice(2)}`;
}

/** استخراج الأرقام فقط من رقم الهاتف */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** التحقق من صحة رقم الهاتف المصري */
export function isValidEgPhone(raw: string): boolean {
  return EGYPTIAN_PHONE_REGEX.test(normalizePhone(raw));
}

/** تنظيف 입력 من أكواد HTML 기본ية لمنع XSS بسيط (الجانب العميل) */
export function sanitizeInput(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .trim();
}

/** التحقق العام من نموذج باستخدام قواعد */
export function validateForm(
  values: Record<string, string>,
  rules: Record<string, ValidationRule>,
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = values[field] ?? "";

    if (rule.required && !value.trim()) {
      errors[field] = rule.message ?? "هذا الحقل مطلوب";
      continue;
    }

    if (value.trim() && rule.minLength !== undefined && value.trim().length < rule.minLength) {
      errors[field] = rule.message ?? `لا يقل عن ${rule.minLength} أحرف`;
      continue;
    }

    if (value.trim() && rule.maxLength !== undefined && value.trim().length > rule.maxLength) {
      errors[field] = rule.message ?? `لا يزيد عن ${rule.maxLength} أحرف`;
      continue;
    }

    if (value.trim() && rule.pattern) {
      const matches =
        rule.pattern instanceof RegExp
          ? rule.pattern.test(value.trim())
          : rule.pattern(value.trim());
      if (!matches) {
        errors[field] = rule.message ?? "صيغة غير صحيحة";
        continue;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/* ------------------------------------------------------------------ */
/*  حماية رقم سري (PIN) للوحة الأدمن والإجراءات الحساسة                */
/*  تُخزن في sessionStorage فقط أثناء الجلسة الحالية                   */
/* ------------------------------------------------------------------ */

const ADMIN_PIN_KEY = "medicore.admin_pin";
const DEFAULT_ADMIN_PIN = "1234"; // رقم سري افتراضي للتجربة — يُغيَّر في الإنتاج

export function setAdminPin(pin: string): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(ADMIN_PIN_KEY, pin);
  }
}

export function getAdminPin(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage.getItem(ADMIN_PIN_KEY) ?? null;
}

export function verifyAdminPin(pin: string): boolean {
  const expected = getAdminPin() ?? DEFAULT_ADMIN_PIN;
  return pin === expected;
}

export function isAdminUnlocked(): boolean {
  return Boolean(getAdminPin());
}

export function clearAdminPin(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(ADMIN_PIN_KEY);
  }
}

/* ------------------------------------------------------------------ */
/*  تقييد المعدل بسيط (debounce) لمنع الحجز المكرر السريع            */
/* ------------------------------------------------------------------ */

export function createRateLimiter(minIntervalMs: number) {
  let lastCall = 0;
  return () => {
    const now = Date.now();
    if (now - lastCall < minIntervalMs) return false;
    lastCall = now;
    return true;
  };
}

/* ------------------------------------------------------------------ */
/*  ترميز معرفات لعرض عام (إخفاء جزء من رقم الهاتف في القوائم)      */
/* ------------------------------------------------------------------ */

export function maskPhone(raw: string | null | undefined): string {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return raw;
  const visible = digits.slice(-4);
  return `•••• ••• ${visible}`;
}

/* ------------------------------------------------------------------ */
/*  التحقق من أصل CORS بناءً على قائمة السماح                           */
/*  مستوحى من مهارة "Testing CORS Misconfiguration"                    */
/* ------------------------------------------------------------------ */

export type CorsOriginPolicy = "strict" | "permissive";

export interface CorsConfig {
  allowedOrigins: string[];
  allowCredentials: boolean;
  maxAgeSeconds: number;
  policy: CorsOriginPolicy;
}

export const DEFAULT_CORS_CONFIG: CorsConfig = {
  allowedOrigins: [
    "http://localhost:3000",
    process.env.NEXT_PUBLIC_APP_URL ?? "",
  ].filter(Boolean),
  allowCredentials: true,
  maxAgeSeconds: 600,
  policy: "strict",
};

export function isCorsOriginAllowed(
  origin: string | null,
  config: CorsConfig = DEFAULT_CORS_CONFIG,
): boolean {
  if (!origin) return false;
  if (config.policy === "permissive") return true;
  return config.allowedOrigins.includes(origin);
}

export function buildCorsHeaders(
  origin: string | null,
  config: CorsConfig = DEFAULT_CORS_CONFIG,
): Record<string, string> {
  if (!origin || !isCorsOriginAllowed(origin, config)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": config.allowCredentials ? "true" : "false",
    "Access-Control-Allow-Methods":
      "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, Accept, Origin",
    "Access-Control-Max-Age": String(config.maxAgeSeconds),
    "Vary": "Origin",
  };
}

/* ------------------------------------------------------------------ */
/*  توليد رمز سري (nonce) لرأس CSP                                     */
/*  مستوحى من مهارة "Performing Security Headers Audit"                */
/* ------------------------------------------------------------------ */

export function generateCspNonce(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

/* ------------------------------------------------------------------ */
/*  فحص بنية JWT الأساسية (بدون التحقق من التوقيع)                     */
/*  مستوحى من مهارة "Testing for JSON Web Token Vulnerabilities"       */
/* ------------------------------------------------------------------ */

export interface JwtPayload {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  isValidStructure: boolean;
  warnings: string[];
}

export function decodeJwtStructure(token: string): JwtPayload {
  const warnings: string[] = [];
  const parts = token.split(".");

  if (parts.length !== 3) {
    return {
      header: {},
      payload: {},
      signature: "",
      isValidStructure: false,
      warnings: ["JWT must have exactly 3 parts separated by dots"],
    };
  }

  const [headerB64, payloadB64, signature] = parts;

  let header: Record<string, unknown> = {};
  let payload: Record<string, unknown> = {};

  try {
    header = JSON.parse(
      Buffer.from(headerB64, "base64").toString("utf-8"),
    ) as Record<string, unknown>;
  } catch {
    warnings.push("Invalid JWT header encoding");
  }

  try {
    payload = JSON.parse(
      Buffer.from(payloadB64, "base64").toString("utf-8"),
    ) as Record<string, unknown>;
  } catch {
    warnings.push("Invalid JWT payload encoding");
  }

  // تحذيرات أمنية من مهارة JWT
  const alg = header.alg;
  if (alg === "none" || alg === "None" || alg === "NONE") {
    warnings.push(
      "CRITICAL: JWT algorithm is 'none' — unsigned tokens are accepted",
    );
  }
  if (alg === "HS256" && header.typ !== "JWT") {
    warnings.push("JWT typ header missing or unusual");
  }

  // فحص انتهاء الصلاحية
  const exp = payload.exp as number | undefined;
  if (exp !== undefined) {
    const now = Math.floor(Date.now() / 1000);
    if (exp < now) {
      warnings.push("JWT has expired");
    }
  }

  return {
    header,
    payload,
    signature,
    isValidStructure: warnings.length === 0,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/*  فحص رأس CSP واقتراح تحسينات                                         */
/*  مستوحى من مهارة "Performing Security Headers Audit"                 */
/* ------------------------------------------------------------------ */

export interface CspAuditResult {
  grade: "A" | "B" | "C" | "D" | "F";
  issues: string[];
  recommendations: string[];
}

export function auditCspHeader(cspHeader: string | null): CspAuditResult {
  const issues: string[] = [];
  const recommendations: string[] = [];

  if (!cspHeader) {
    issues.push("Content-Security-Policy header is missing");
    recommendations.push(
      "Add Content-Security-Policy header with script-src 'self'",
    );
    return { grade: "F", issues, recommendations };
  }

  const directives = cspHeader.split(";").map((d) => d.trim());

  const hasUnsafeInline =
    directives.some((d) => d.includes("script-src")) &&
    directives.some((d) => d.includes("'unsafe-inline'"));
  const hasUnsafeEval =
    directives.some((d) => d.includes("script-src")) &&
    directives.some((d) => d.includes("'unsafe-eval'"));
  const hasWildcard = directives.some((d) => d.includes("*"));
  const hasDefaultSrc = directives.some((d) => d.startsWith("default-src"));
  const hasFrameAncestors = directives.some((d) =>
    d.startsWith("frame-ancestors"),
  );

  if (hasUnsafeInline) {
    issues.push("CSP allows 'unsafe-inline' in script-src — XSS risk");
    recommendations.push(
      "Replace 'unsafe-inline' with nonce-based or hash-based script policy",
    );
  }
  if (hasUnsafeEval) {
    issues.push("CSP allows 'unsafe-eval' — code injection risk");
    recommendations.push("Remove 'unsafe-eval' from script-src");
  }
  if (hasWildcard) {
    issues.push("CSP contains wildcard (*) — allows loading from any origin");
    recommendations.push("Replace wildcard with specific trusted domains");
  }
  if (!hasDefaultSrc) {
    issues.push("No default-src directive — no fallback policy");
    recommendations.push("Add default-src 'self' as fallback");
  }
  if (!hasFrameAncestors) {
    issues.push("No frame-ancestors directive — clickjacking risk");
    recommendations.push("Add frame-ancestors 'none' or 'self'");
  }

  let grade: CspAuditResult["grade"] = "A";
  if (issues.length >= 4) grade = "F";
  else if (issues.length >= 3) grade = "D";
  else if (issues.length >= 2) grade = "C";
  else if (issues.length >= 1) grade = "B";

  return { grade, issues, recommendations };
}