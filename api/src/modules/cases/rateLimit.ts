// Sliding-window limiter for the public intake resolvers. In-memory and
// per process: good enough to blunt brute force on tracking PINs and spam
// on the submit mutation; a shared store is not needed for one API replica.

const MAX_TRACKED_KEYS = 10_000;

export type RateLimiter = {
  allow(key: string): boolean;
  reset(): void;
};

export const createRateLimiter = (options: {
  max: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter => {
  const { max, windowMs, now = Date.now } = options;
  const hits = new Map<string, number[]>();

  return {
    allow(key) {
      const current = now();
      const floor = current - windowMs;
      const recent = (hits.get(key) ?? []).filter((at) => at > floor);

      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }

      recent.push(current);
      // Re-insert so Map iteration order doubles as least-recently-used order.
      hits.delete(key);
      hits.set(key, recent);

      if (hits.size > MAX_TRACKED_KEYS) {
        const oldest = hits.keys().next().value;
        if (oldest !== undefined) {
          hits.delete(oldest);
        }
      }

      return true;
    },
    reset() {
      hits.clear();
    },
  };
};
