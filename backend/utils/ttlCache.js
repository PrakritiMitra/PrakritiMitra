class TtlCache {
  constructor({ maxSize = 200, defaultTtlMs = 60_000 } = {}) {
    this.maxSize = maxSize;
    this.defaultTtlMs = defaultTtlMs;
    this.map = new Map(); // key -> { value, expiresAt }
  }

  _now() {
    return Date.now();
  }

  _pruneExpired() {
    const now = this._now();
    for (const [key, entry] of this.map.entries()) {
      if (entry.expiresAt <= now) this.map.delete(key);
    }
  }

  _enforceMaxSize() {
    while (this.map.size > this.maxSize) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this._now()) {
      this.map.delete(key);
      return undefined;
    }
    // refresh recency (simple LRU-ish behavior)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    this._pruneExpired();
    const entry = { value, expiresAt: this._now() + ttlMs };
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, entry);
    this._enforceMaxSize();
  }
}

module.exports = { TtlCache };

