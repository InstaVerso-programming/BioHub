import time
from typing import Any

class TTLCache:
    """Simple in-memory cache; swap for Redis in production."""
    def __init__(self, ttl: int = 3600):
        self.ttl, self._d = ttl, {}
    def get(self, k: str) -> Any:
        v = self._d.get(k)
        if v and time.time() - v[0] < self.ttl:
            return v[1]
        self._d.pop(k, None)
    def set(self, k: str, val: Any):
        self._d[k] = (time.time(), val)

cache = TTLCache()
