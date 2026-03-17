/**
 * Generate a hash of an API key for secure storage.
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a standardized API error response.
 */
export function apiError(
  status: number,
  message: string,
  details?: unknown
): { status: number; body: { error: string; details?: unknown } } {
  return {
    status,
    body: { error: message, ...(details ? { details } : {}) },
  };
}

/**
 * Paginate an array of items.
 */
export function paginate<T>(
  items: T[],
  page: number,
  limit: number
): { data: T[]; total: number; page: number; limit: number; pages: number } {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    total: items.length,
    page,
    limit,
    pages: Math.ceil(items.length / limit),
  };
}
