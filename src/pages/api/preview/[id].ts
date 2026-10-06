import type { APIRoute } from "astro";
import { createPublicClient } from "../../../lib/server/public-catalog";
import { checked } from "../../../lib/server/catalog";
import { positiveId, AccessError, errorResponse } from "../../../lib/security";
import { storagePath, imageTypes } from "../../../lib/catalog";
import { serverConfig } from "../../../lib/server/config";
export const GET: APIRoute = async (context) => {
  try {
    const id = positiveId(context.params.id),
      client = createPublicClient();
    // Anonymous column privileges + RLS enforce current listing publication.
    const listing = await client
      .from("listings")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    checked(listing.error);
    if (!listing.data)
      throw new AccessError(
        404,
        "image_unavailable",
        "This image is unavailable.",
      );
    const result = await client
      .from("listing_images")
      .select("image_url")
      .eq("listing_id", id)
      .order("is_primary", { ascending: false })
      .order("display_order")
      .order("id")
      .limit(1)
      .maybeSingle();
    checked(result.error);
    const path = storagePath(
      result.data?.image_url ?? "",
      serverConfig().url,
      "listing-images",
    );
    if (!path)
      throw new AccessError(
        404,
        "image_unavailable",
        "This image is unavailable.",
      );
    const file = await client.storage.from("listing-images").download(path);
    checked(file.error);
    if (!file.data || !imageTypes.some((type) => type === file.data!.type))
      throw new AccessError(
        404,
        "image_unavailable",
        "This image is unavailable.",
      );
    return new Response(file.data, {
      headers: {
        "Content-Type": file.data.type,
        "Content-Disposition": "inline",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
