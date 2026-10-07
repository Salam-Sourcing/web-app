import { dealDocumentUrl } from "../../../../lib/server/deals";
import { enquiry, conversation } from "../../../../lib/server/procurement";
import type { APIRoute } from "astro";
import { requireWorkspace } from "../../../../lib/server/access";
import {
  checked,
  companyManager,
  publicListing,
  sellerListing,
} from "../../../../lib/server/catalog";
import {
  AccessError,
  positiveId,
  errorResponse,
} from "../../../../lib/security";
import { storagePath, imageTypes } from "../../../../lib/catalog";
import { serverConfig } from "../../../../lib/server/config";
export const GET: APIRoute = async (context) => {
  try {
    const state = await requireWorkspace(context),
      id =
        context.params.kind === "profile" ? 1 : positiveId(context.params.id),
      kind = context.params.kind;
    let path: string | null = null,
      bucket: string,
      name = "Document";
    if (kind === "profile") {
      if (context.params.id !== "me")
        throw new AccessError(
          404,
          "file_unavailable",
          "This photo is unavailable.",
        );
      const result = await state.client
        .from("profile_photos")
        .select("storage_path")
        .eq("user_id", state.user.id)
        .maybeSingle();
      checked(result.error);
      if (!result.data)
        throw new AccessError(
          404,
          "file_unavailable",
          "Your profile photo is unavailable.",
        );
      path = result.data.storage_path;
      bucket = "profile-photos";
      name = "Profile photo";
    } else if (kind === "company") {
      const result = await state.client
        .from("company_photos")
        .select("storage_path")
        .eq("company_id", id)
        .maybeSingle();
      checked(result.error);
      if (!result.data)
        throw new AccessError(
          404,
          "file_unavailable",
          "This company photo is unavailable.",
        );
      path = result.data.storage_path;
      bucket = "company-photos";
      name = "Company photo";
    } else if (kind === "listing") {
      const own = await state.client
        .from("listings")
        .select("company_id")
        .eq("id", id)
        .maybeSingle();
      checked(own.error);
      if (
        own.data?.company_id === state.company?.id &&
        state.permissions.includes("listings")
      )
        await sellerListing(state, id);
      else await publicListing(state, id);
      let query = state.client
        .from("listing_images")
        .select("image_url,alt_text")
        .eq("listing_id", id);
      const image = context.url.searchParams.get("image");
      if (image) query = query.eq("id", positiveId(image));
      const result = await query
        .order("is_primary", { ascending: false })
        .order("display_order")
        .order("id")
        .limit(1)
        .maybeSingle();
      checked(result.error);
      path = result.data?.image_url ?? null;
      bucket = "listing-images";
    } else if (kind === "document") {
      const company = companyManager(state);
      const row = await state.client
        .from("verification_documents")
        .select("file_url,file_name,company_verifications(company_id)")
        .eq("id", id)
        .maybeSingle();
      checked(row.error);
      if (
        !row.data ||
        row.data.company_verifications?.company_id !== company.id
      )
        throw new AccessError(
          404,
          "record_unavailable",
          "This document is unavailable.",
        );
      path = row.data.file_url;
      bucket = "company-verification-documents";
      name = row.data.file_name ?? name;
    } else if (kind === "enquiry") {
      const row = await state.client
        .from("enquiry_attachments")
        .select("enquiry_id,storage_path,file_name")
        .eq("id", id)
        .maybeSingle();
      checked(row.error);
      if (!row.data)
        throw new AccessError(
          404,
          "file_unavailable",
          "This file is unavailable.",
        );
      await enquiry(state, row.data.enquiry_id);
      path = row.data.storage_path;
      name = row.data.file_name;
      bucket = "enquiry-attachments";
    } else if (kind === "deal") {
      const url = await dealDocumentUrl(state, id, serverConfig().url);
      return new Response(null, {
        status: 303,
        headers: {
          Location: url,
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
    } else if (kind === "message") {
      const row = await state.client
        .from("message_attachments")
        .select("file_url,file_name,messages(conversation_id,is_deleted)")
        .eq("id", id)
        .maybeSingle();
      checked(row.error);
      if (!row.data || row.data.messages?.is_deleted)
        throw new AccessError(
          404,
          "file_unavailable",
          "This file is unavailable.",
        );
      await conversation(state, row.data.messages.conversation_id);
      path = row.data.file_url;
      name = row.data.file_name ?? name;
      bucket = "message-attachments";
    } else throw new AccessError(404, "not_found", "This file is unavailable.");
    path = path ? storagePath(path, serverConfig().url, bucket) : null;
    if (!path)
      throw new AccessError(
        404,
        "record_unavailable",
        "This file is unavailable.",
      );
    // Authorize every request through Storage RLS. No reusable signed token is exposed.
    const result = await state.client.storage.from(bucket).download(path);
    checked(result.error);
    if (
      !result.data ||
      !(["listing", "company", "profile"].includes(kind ?? "")
        ? imageTypes.includes(result.data.type as (typeof imageTypes)[number])
        : [...imageTypes, "application/pdf"].includes(result.data.type))
    )
      throw new AccessError(
        404,
        "record_unavailable",
        "This file is unavailable.",
      );
    const headers = new Headers({
      "Content-Type": result.data.type,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy":
        "default-src 'none'; sandbox; frame-ancestors 'none'",
    });
    const inlineImage =
      kind === "message" &&
      context.url.searchParams.get("inline") === "1" &&
      imageTypes.includes(result.data.type as (typeof imageTypes)[number]);
    if (!["listing", "company", "profile"].includes(kind ?? "") && !inlineImage)
      headers.set(
        "Content-Disposition",
        "attachment; filename=" +
          JSON.stringify(name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100)),
      );
    return new Response(result.data, { headers });
  } catch (error) {
    return errorResponse(error);
  }
};
