export interface ServiceWorkerUpdatePayload {
  type: "SW_UPDATE_AVAILABLE" | "SW_ACTIVATED";
  version: string;
}

let updateHandler: ((payload: ServiceWorkerUpdatePayload) => void) | null = null;
let registrationPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export const setServiceWorkerUpdateHandler = (
  handler: ((payload: ServiceWorkerUpdatePayload) => void) | null,
) => {
  updateHandler = handler;
};

export const waitForServiceWorkerRegistration = (): Promise<ServiceWorkerRegistration | null> => {
  if (!("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        navigator.serviceWorker.addEventListener("message", (event: MessageEvent<ServiceWorkerUpdatePayload>) => {
          const data = event.data;
          if (!data || (data.type !== "SW_UPDATE_AVAILABLE" && data.type !== "SW_ACTIVATED")) return;
          updateHandler?.(data);
        });
        registration.update().catch(() => undefined);
        return registration;
      })
      .catch(() => null);
  }
  return registrationPromise;
};

export const registerServiceWorker = () => {
  void waitForServiceWorkerRegistration();
};
