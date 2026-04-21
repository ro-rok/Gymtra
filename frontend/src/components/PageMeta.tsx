import { useEffect } from "react";

import { applyMetadata, type MetadataInput } from "@/lib/metadata";

export const PageMeta = (props: MetadataInput) => {
  useEffect(() => {
    applyMetadata(props);
  }, [props.title, props.description, props.canonicalPath, props.ogTitle, props.ogDescription, props.noindex]);

  return null;
};

