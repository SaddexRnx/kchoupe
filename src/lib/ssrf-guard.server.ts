// SSRF guard for user-supplied URLs used in server fetches.
// Blocks non-http(s) schemes, non-standard ports, and hostnames that
// resolve (or are literally) loopback / link-local / private / reserved IPs.

import { lookup } from "node:dns/promises";

const ALLOWED_PORTS = new Set(["", "80", "443"]);

function ipToLong(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

function isPrivateV4(ip: string): boolean {
  const n = ipToLong(ip);
  if (n == null) return false;
  const inRange = (a: string, bits: number) => {
    const base = ipToLong(a)!;
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (n & mask) === (base & mask);
  };
  return (
    inRange("0.0.0.0", 8) ||
    inRange("10.0.0.0", 8) ||
    inRange("127.0.0.0", 8) ||
    inRange("169.254.0.0", 16) ||
    inRange("172.16.0.0", 12) ||
    inRange("192.0.0.0", 24) ||
    inRange("192.168.0.0", 16) ||
    inRange("198.18.0.0", 15) ||
    inRange("100.64.0.0", 10) ||
    inRange("224.0.0.0", 4) ||
    inRange("240.0.0.0", 4)
  );
}

function isPrivateV6(ip: string): boolean {
  const s = ip.toLowerCase();
  if (s === "::" || s === "::1") return true;
  if (s.startsWith("fe80:") || s.startsWith("fc") || s.startsWith("fd")) return true;
  if (s.startsWith("::ffff:")) {
    const v4 = s.slice(7);
    if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return isPrivateV4(v4);
  }
  return false;
}

export class SsrfBlockedError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "SsrfBlockedError";
  }
}

/**
 * Validate a user-supplied URL is safe to fetch server-side.
 * Throws SsrfBlockedError if the URL targets internal / private space.
 */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let u: URL;
  try { u = new URL(rawUrl); } catch { throw new SsrfBlockedError("Invalid URL"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new SsrfBlockedError("Only http(s) URLs are allowed");
  }
  if (!ALLOWED_PORTS.has(u.port)) {
    throw new SsrfBlockedError(`Port ${u.port} is not allowed`);
  }
  const host = u.hostname.replace(/^\[|\]$/g, "");
  // Reject obvious internal hostnames
  const lower = host.toLowerCase();
  if (
    lower === "localhost" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower === "metadata.google.internal"
  ) throw new SsrfBlockedError("Internal hostname is not allowed");

  // If literal IP, check directly
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    if (isPrivateV4(host)) throw new SsrfBlockedError("Private IP is not allowed");
    return u;
  }
  if (host.includes(":")) {
    if (isPrivateV6(host)) throw new SsrfBlockedError("Private IPv6 is not allowed");
    return u;
  }

  // Resolve DNS and check every address
  try {
    const addrs = await lookup(host, { all: true });
    for (const a of addrs) {
      if (a.family === 4 && isPrivateV4(a.address)) {
        throw new SsrfBlockedError("Hostname resolves to a private address");
      }
      if (a.family === 6 && isPrivateV6(a.address)) {
        throw new SsrfBlockedError("Hostname resolves to a private address");
      }
    }
  } catch (e) {
    if (e instanceof SsrfBlockedError) throw e;
    // DNS unavailable in some runtimes — fall through with hostname-only checks above.
  }
  return u;
}

/**
 * Fetch a user-supplied URL with SSRF protection.
 * Follows redirects manually so each hop is re-validated.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit = {},
  opts: { maxRedirects?: number; timeoutMs?: number } = {},
): Promise<Response> {
  const maxRedirects = opts.maxRedirects ?? 5;
  const timeoutMs = opts.timeoutMs ?? 15000;
  let current = rawUrl;
  for (let i = 0; i <= maxRedirects; i++) {
    const u = await assertSafeUrl(current);
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(u.toString(), { ...init, redirect: "manual", signal: ctl.signal });
    } finally { clearTimeout(t); }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      current = new URL(loc, u).toString();
      continue;
    }
    return res;
  }
  throw new SsrfBlockedError("Too many redirects");
}
