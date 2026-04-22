const getBaseUrl = () => {
  const configured = import.meta.env.VITE_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:8080";
};

const setMetaTag = (selector: string, attr: "content" | "href", value: string) => {
  let element = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!element) {
    if (attr === "href") {
      element = document.createElement("link");
      (element as HTMLLinkElement).setAttribute("rel", "canonical");
    } else {
      element = document.createElement("meta");
      const name = selector.includes("property=")
        ? selector.match(/property="([^"]+)"/)?.[1]
        : selector.match(/name="([^"]+)"/)?.[1];
      if (name) {
        const key = selector.includes("property=") ? "property" : "name";
        element.setAttribute(key, name);
      }
    }
    document.head.appendChild(element);
  }
  element.setAttribute(attr, value);
};

export interface MetadataInput {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogTitle?: string;
  ogDescription?: string;
  noindex?: boolean;
}

export const applyMetadata = (input: MetadataInput) => {
  const title = input.title || "Gymtra";
  const description =
    input.description || "Find your gym, track progress, and manage members with Gymtra.";
  const canonical = `${getBaseUrl()}${input.canonicalPath || "/"}`;
  document.title = title;
  setMetaTag('meta[name="description"]', "content", description);
  setMetaTag('meta[property="og:title"]', "content", input.ogTitle || title);
  setMetaTag('meta[property="og:description"]', "content", input.ogDescription || description);
  setMetaTag('meta[property="og:url"]', "content", canonical);
  setMetaTag('link[rel="canonical"]', "href", canonical);
  setMetaTag('meta[name="robots"]', "content", input.noindex ? "noindex,nofollow" : "index,follow");
};

