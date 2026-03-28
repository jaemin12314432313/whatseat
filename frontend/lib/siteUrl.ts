import { headers } from "next/headers";
import type { NextRequest } from "next/server";

/**
 * Route Handler·Server Action 등 `NextRequest`가 없을 때 공개 origin.
 * `getSiteUrl(request)`와 같은 우선순위(NEXT_PUBLIC_SITE_URL → 프록시 헤더 → Vercel).
 */
export async function getSiteUrlFromHeaders(): Promise<string> {
  const h = await headers();
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const forwardedHost = h.get("x-forwarded-host");
  const forwardedProto = h.get("x-forwarded-proto");
  if (forwardedHost) {
    const proto = forwardedProto ?? "https";
    return `${proto}://${forwardedHost}`;
  }

  const host = h.get("host");
  if (host) {
    const proto =
      forwardedProto ?? (host.includes("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "")}`;
  }

  return "http://localhost:3000";
}

/**
 * 배포(Vercel)·리버스 프록시에서 공개 URL을 안정적으로 맞춤.
 * 커스텀 도메인이면 Vercel에 `NEXT_PUBLIC_SITE_URL`을 넣는 것을 권장.
 */
export function getSiteUrl(request: NextRequest): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (explicit) return explicit;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const proto = forwardedProto ?? "https";
    return `${proto}://${forwardedHost}`;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/^https?:\/\//, "")}`;
  }

  return request.nextUrl.origin;
}
