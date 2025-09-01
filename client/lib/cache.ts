export async function clearAllAppCaches(): Promise<void> {
  try {
    if (typeof window !== "undefined") {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch {}
    }
  } catch {}
}
