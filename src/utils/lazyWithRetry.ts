import { lazy, type ComponentType } from "react";

const RELOAD_FLAG = "sp_chunk_reload";

// Después de un deploy, los archivos JS de la versión anterior ya no existen.
// Si una pantalla falla al descargarse, recargamos una sola vez para traer la
// versión nueva; si vuelve a fallar, el error sigue hacia el ErrorBoundary.
export function lazyWithRetry<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
  return lazy(async () => {
    try {
      const module = await factory();
      try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* storage no disponible */ }
      return module;
    } catch (error) {
      let alreadyReloaded = false;
      try { alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1"; } catch { /* storage no disponible */ }
      if (!alreadyReloaded) {
        try { sessionStorage.setItem(RELOAD_FLAG, "1"); } catch { /* storage no disponible */ }
        window.location.reload();
        // Mientras el navegador recarga, el Suspense sigue mostrando el loader
        return new Promise<{ default: T }>(() => {});
      }
      throw error;
    }
  });
}
