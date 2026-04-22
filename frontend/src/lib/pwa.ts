export interface ServiceWorkerUpdatePayload {
  type: "SW_UPDATE_AVAILABLE" | "SW_ACTIVATED";
  version: string;
}

let updateHandler: ((payload: ServiceWorkerUpdatePayload) => void) | null = null;

export const setServiceWorkerUpdateHandler = (
  handler: ((payload: ServiceWorkerUpdatePayload) => void) | null,
) => {
  updateHandler = handler;
};

export const registerServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        navigator.serviceWorker.addEventListener("message", (event: MessageEvent<ServiceWorkerUpdatePayload>) => {
          const data = event.data;
          if (!data || (data.type !== "SW_UPDATE_AVAILABLE" && data.type !== "SW_ACTIVATED")) return;
          updateHandler?.(data);
        });
        registration.update().catch(() => undefined);
      })
      .catch(() => undefined);
  });
};

