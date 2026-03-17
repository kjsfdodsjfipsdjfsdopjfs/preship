import { lookup } from "dns/promises";
import { URL } from "url";
import { isIP } from "net";

/**
 * Error thrown when a URL fails SSRF validation.
 */
export class UrlValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlValidationError";
  }
}

/**
 * Private/internal IPv4 CIDR ranges (RFC 1918, loopback, link-local, etc.)
 *
 * Each entry is [networkAddress, prefixLength].
 */
const BLOCKED_IPV4_RANGES: Array<[string, number]> = [
  // Loopback
  ["127.0.0.0", 8],
  // Private networks (RFC 1918)
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  // Link-local
  ["169.254.0.0", 16],
  // Current network
  ["0.0.0.0", 8],
  // Shared address space (RFC 6598)
  ["100.64.0.0", 10],
  // IETF protocol assignments
  ["192.0.0.0", 24],
  // Documentation (RFC 5737)
  ["192.0.2.0", 24],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  // Benchmarking (RFC 2544)
  ["198.18.0.0", 15],
  // Broadcast
  ["255.255.255.255", 32],
];

/**
 * Blocked IPv6 prefixes (loopback, link-local, unique local, etc.)
 */
const BLOCKED_IPV6_PREFIXES: string[] = [
  "::1",         // Loopback
  "fc",          // Unique local (fc00::/7)
  "fd",          // Unique local (fc00::/7)
  "fe80",        // Link-local
  "::",          // Unspecified
];

/**
 * Cloud metadata endpoints that must be blocked.
 * Attackers use these to steal credentials from cloud instances.
 */
const BLOCKED_HOSTNAMES: string[] = [
  // AWS metadata
  "169.254.169.254",
  // AWS metadata (IPv6)
  "fd00:ec2::254",
  // GCP metadata
  "metadata.google.internal",
  // Azure metadata
  "169.254.169.254",
  // DigitalOcean metadata
  "169.254.169.254",
  // Alibaba Cloud metadata
  "100.100.100.200",
];

/**
 * Allowed protocols. Only HTTP and HTTPS are permitted.
 */
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Convert an IPv4 address string to a 32-bit integer for range checking.
 */
function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Check if an IPv4 address falls within a CIDR range.
 */
function isInCidr(ip: string, network: string, prefix: number): boolean {
  const ipInt = ipv4ToInt(ip);
  const networkInt = ipv4ToInt(network);
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (ipInt & mask) === (networkInt & mask);
}

/**
 * Check if an IPv4 address is in any blocked range.
 */
function isBlockedIPv4(ip: string): boolean {
  for (const [network, prefix] of BLOCKED_IPV4_RANGES) {
    if (isInCidr(ip, network, prefix)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if an IPv6 address is in any blocked range.
 * Also handles IPv4-mapped IPv6 addresses (::ffff:x.x.x.x).
 */
function isBlockedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Check for IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
  const v4MappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4MappedMatch) {
    return isBlockedIPv4(v4MappedMatch[1]);
  }

  // Check for IPv4-compatible IPv6 addresses (::192.168.1.1)
  const v4CompatMatch = normalized.match(/^::(\d+\.\d+\.\d+\.\d+)$/);
  if (v4CompatMatch) {
    return isBlockedIPv4(v4CompatMatch[1]);
  }

  // Check loopback
  if (normalized === "::1" || normalized === "::") {
    return true;
  }

  // Check blocked prefixes
  for (const prefix of BLOCKED_IPV6_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a resolved IP address (v4 or v6) is internal/private.
 */
function isPrivateIP(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedIPv4(ip);
  if (version === 6) return isBlockedIPv6(ip);
  return false;
}

/**
 * Validate a URL for SSRF safety before navigating with Puppeteer.
 *
 * Performs the following checks:
 * 1. Only HTTP/HTTPS protocols are allowed (blocks file://, ftp://, data://, etc.)
 * 2. Hostname is not a known cloud metadata endpoint
 * 3. If hostname is a literal IP, checks it against private/internal ranges
 * 4. Resolves DNS and checks the resolved IP is not internal/private
 * 5. Blocks loopback, link-local, and RFC 1918 addresses
 *
 * @param url - The URL to validate
 * @throws {UrlValidationError} if the URL is unsafe
 */
export async function validateUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UrlValidationError(`Invalid URL: ${url}`);
  }

  // 1. Check protocol
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new UrlValidationError(
      `Blocked protocol "${parsed.protocol}" in URL. Only HTTP and HTTPS are allowed.`
    );
  }

  // 2. Check for blocked hostnames (cloud metadata endpoints)
  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new UrlValidationError(
      `Blocked hostname "${hostname}": access to cloud metadata endpoints is not allowed.`
    );
  }

  // Block localhost variants
  if (
    hostname === "localhost" ||
    hostname === "localhost." ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".localhost.")
  ) {
    throw new UrlValidationError(
      `Blocked hostname "${hostname}": localhost access is not allowed.`
    );
  }

  // 3. If hostname is a literal IP address, check it directly
  if (isIP(hostname)) {
    if (isPrivateIP(hostname)) {
      throw new UrlValidationError(
        `Blocked IP address "${hostname}": access to private/internal networks is not allowed.`
      );
    }
    // IP is public, no DNS resolution needed
    return;
  }

  // 4. Resolve DNS and check the resolved IP
  try {
    const result = await lookup(hostname, { all: true });
    const addresses = Array.isArray(result) ? result : [result];

    for (const entry of addresses) {
      if (isPrivateIP(entry.address)) {
        throw new UrlValidationError(
          `Blocked URL "${url}": hostname "${hostname}" resolves to private/internal IP "${entry.address}".`
        );
      }
    }
  } catch (error) {
    // Re-throw our own validation errors
    if (error instanceof UrlValidationError) {
      throw error;
    }
    // DNS resolution failure -- block to be safe (prevents DNS rebinding edge cases)
    throw new UrlValidationError(
      `DNS resolution failed for hostname "${hostname}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Validate a URL synchronously for basic checks only (protocol, hostname literals).
 * Does NOT perform DNS resolution. Use `validateUrl` for full protection.
 *
 * Useful for quick pre-filtering before the async DNS check.
 */
export function validateUrlSync(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UrlValidationError(`Invalid URL: ${url}`);
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new UrlValidationError(
      `Blocked protocol "${parsed.protocol}" in URL. Only HTTP and HTTPS are allowed.`
    );
  }

  const hostname = parsed.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new UrlValidationError(
      `Blocked hostname "${hostname}": access to cloud metadata endpoints is not allowed.`
    );
  }

  if (
    hostname === "localhost" ||
    hostname === "localhost." ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".localhost.")
  ) {
    throw new UrlValidationError(
      `Blocked hostname "${hostname}": localhost access is not allowed.`
    );
  }

  if (isIP(hostname) && isPrivateIP(hostname)) {
    throw new UrlValidationError(
      `Blocked IP address "${hostname}": access to private/internal networks is not allowed.`
    );
  }
}
