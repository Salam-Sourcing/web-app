import { createClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { serverConfig } from "./config";
import { checked } from "./catalog";
import { AccessError } from "../security";
export type PreviewCard = {
  id: number;
  company_id: number;
  name: string;
  listing_type: string;
  category: string;
  vendor_name: string;
  location: string;
  has_image: boolean;
};
export function createPublicClient() {
  const config = serverConfig();
  if (!config.configured)
    throw new AccessError(
      503,
      "catalog_unavailable",
      "The marketplace is temporarily unavailable. Please retry.",
    );
  // Public responses never inherit the visitor's cookies or privileged credentials.
  return createClient<Database>(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal ?? AbortSignal.timeout(10000),
        }),
    },
  });
}
export async function marketplacePreview(client = createPublicClient()) {
  const result = await client.rpc("get_marketplace_preview");
  checked(result.error);
  const data = result.data as {
    listings?: PreviewCard[];
    categories?: string[];
  } | null;
  return {
    listings: Array.isArray(data?.listings)
      ? data.listings
          .slice(0, 24)
          .map(
            ({
              id,
              company_id,
              name,
              listing_type,
              category,
              vendor_name,
              location,
              has_image,
            }) => ({
              id,
              company_id,
              name,
              listing_type,
              category,
              vendor_name,
              location,
              has_image,
            }),
          )
      : [],
    categories: Array.isArray(data?.categories) ? data.categories : [],
  };
}
