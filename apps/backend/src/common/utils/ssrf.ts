import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * SSRF guard for server-side fetches of caller-supplied URLs.
 *
 * The backend downloads report images by URL (Cloudinary assets) before running
 * AI inference. Because the URL originates from client input, an attacker could
 * point it at internal infrastructure (cloud metadata at 169.254.169.254,
 * localhost services, RFC-1918 hosts). This guard rejects any URL whose host
 * resolves to a private, loopback, link-local, or otherwise reserved address.
 *
 * Callers MUST also disable HTTP redirect following (e.g. axios `maxRedirects: 0`),
 * otherwise a public host could 3xx-redirect to an internal target after this check.
 */

function ipv4ToParts(ip: string): number[] | null {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return null;
  }
  return parts;
}

/** True for private/loopback/link-local/reserved IPv4 ranges. */
function isPrivateIpv4(ip: string): boolean {
  const parts = ipv4ToParts(ip);
  if (!parts) return true; // unparseable → treat as unsafe
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback 127.0.0.0/8
  if (a === 0) return true; // 0.0.0.0/8 "this host"
  if (a === 169 && b === 254) return true; // link-local 169.254.0.0/16 (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a >= 224) return true; // multicast/reserved 224.0.0.0/4 and 240.0.0.0/4
  return false;
}

/** True for private/loopback/link-local/unique-local/reserved IPv6 ranges. */
function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split('%')[0] ?? ''; // strip zone id
  if (addr === '::1' || addr === '::') return true; // loopback / unspecified
  if (addr.startsWith('fe80')) return true; // link-local fe80::/10
  if (addr.startsWith('fc') || addr.startsWith('fd')) return true; // unique-local fc00::/7
  if (addr.startsWith('ff')) return true; // multicast ff00::/8
  // IPv4-mapped (::ffff:a.b.c.d) — validate the embedded IPv4.
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped && mapped[1]) return isPrivateIpv4(mapped[1]);
  return false;
}

function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIpv4(ip);
  if (family === 6) return isPrivateIpv6(ip);
  return true; // not a valid IP → unsafe
}

/**
 * Throws if `rawUrl` is not a plain http(s) URL whose host resolves entirely to
 * public addresses. Returns the parsed URL on success.
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid image URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Blocked URL scheme: ${url.protocol}`);
  }

  const host = url.hostname;

  // Host is an IP literal — check it directly (no DNS).
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('Blocked private/reserved address');
    return url;
  }

  // Hostname — resolve and reject if ANY resolved address is private. This
  // defends against DNS rebinding to internal ranges.
  const records = await lookup(host, { all: true });
  if (records.length === 0) throw new Error('Host did not resolve');
  for (const { address } of records) {
    if (isPrivateAddress(address)) {
      throw new Error('Host resolves to a private/reserved address');
    }
  }

  return url;
}
