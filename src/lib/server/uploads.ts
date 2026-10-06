import { editableDeal, dealBundle } from "./deals";
import { dealFileTypes } from "../deals";
import { enquiry, buyer, conversation, sendText } from "./procurement";
import { requestId, openEnquiry } from "../procurement";
import type { APIContext } from "astro";
import { parseCookieHeader } from "@supabase/ssr";
import { AccessError, json, positiveId, textField } from "../security";
import { validateFile, imageTypes, documentTypes } from "../catalog";
import { requireWorkspace, type Workspace } from "./access";
import {
  checked,
  sellerListing,
  editableVerification,
  companyManager,
} from "./catalog";
type Intent = {
  user: string;
  kind: "listing" | "document" | "enquiry" | "message" | "deal";
  target: number;
  path: string;
  mime: string;
  created: number;
  key: string;
};
const cookieName = (key: string) => "ss-upload-" + key;
const options = (context: APIContext) => ({
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: context.url.protocol === "https:",
});
export function ownedIntent(value: unknown, user: string): value is Intent {
  if (!value || typeof value !== "object") return false;
  const i = value as Intent;
  if (
    i.user !== user ||
    !["listing", "document", "enquiry", "message", "deal"].includes(i.kind) ||
    !Number.isSafeInteger(i.target) ||
    i.target <= 0 ||
    !Number.isFinite(i.created) ||
    i.created > Date.now() ||
    !/^[a-f0-9-]{36}$/.test(i.key)
  )
    return false;
  if (
    !(i.kind === "listing"
      ? imageTypes.includes(i.mime as (typeof imageTypes)[number])
      : i.kind === "deal"
        ? dealFileTypes.includes(i.mime as (typeof dealFileTypes)[number])
        : [...imageTypes, "application/pdf"].includes(i.mime))
  )
    return false;
  const extension =
    i.mime === "application/pdf"
      ? "pdf"
      : i.mime === "image/png"
        ? "png"
        : i.mime === "image/webp"
          ? "webp"
          : "jpg";
  return (
    i.path ===
    (i.kind === "listing" ? user + "/" + i.target : i.target + "/" + user) +
      "/" +
      i.key +
      "." +
      extension
  );
}
function journal(context: APIContext, user: string) {
  const entries: Intent[] = [];
  for (const { name } of parseCookieHeader(
    context.request.headers.get("cookie") ?? "",
  )) {
    if (!name.startsWith("ss-upload-")) continue;
    try {
      const value = JSON.parse(context.cookies.get(name)?.value ?? "");
      if (ownedIntent(value, user) && name === cookieName(value.key))
        entries.push(value);
    } catch {}
  }
  return entries.slice(0, 10);
}
async function target(
  state: Workspace,
  intent: Pick<Intent, "kind" | "target">,
  expected?: unknown,
) {
  if (intent.kind === "listing") {
    const row = await sellerListing(state, intent.target, expected);
    if (!["draft", "rejected"].includes(row.status))
      throw new AccessError(
        409,
        "listing_locked",
        "Save an editable draft before changing images.",
      );
    return row;
  }
  if (intent.kind === "enquiry") {
    const row = await enquiry(state, intent.target);
    buyer(state, row, expected);
    if (!openEnquiry(row) || row.publication_status === "pending_review")
      throw new AccessError(
        409,
        "enquiry_locked",
        "This enquiry cannot receive files now.",
      );
    return row;
  }
  if (intent.kind === "message") {
    const row = await conversation(state, intent.target, expected);
    if (row.status !== "open")
      throw new AccessError(
        409,
        "conversation_archived",
        "This conversation is archived.",
      );
    return row;
  }
  if (intent.kind === "deal")
    return editableDeal(state, intent.target, expected);
  return editableVerification(state, intent.target, expected);
}
export async function prepareUpload(
  context: APIContext,
  input: Record<string, unknown>,
) {
  const state = await requireWorkspace(context),
    kind = textField(input, "kind", 10);
  if (!["listing", "document", "enquiry", "message", "deal"].includes(kind))
    throw new AccessError(400, "invalid_upload", "Choose a valid upload.");
  const id = positiveId(input.target_id);
  await target(
    state,
    { kind: kind as Intent["kind"], target: id },
    input.company_id,
  );
  const entries = journal(context, state.user.id);
  if (entries.length >= 10)
    throw new AccessError(
      409,
      "recovery_full",
      "Upload recovery is full. Retry recovery or contact support.",
    );
  const mime = textField(input, "mime", 50);
  if (
    !(kind === "listing"
      ? imageTypes.includes(mime as (typeof imageTypes)[number])
      : kind === "deal"
        ? dealFileTypes.includes(mime as (typeof dealFileTypes)[number])
        : [...imageTypes, "application/pdf"].includes(mime))
  )
    throw new AccessError(400, "file_type", "This file type is unsupported.");
  if (kind === "listing") {
    const count = await state.client
      .from("listing_images")
      .select("id", { count: "exact", head: true })
      .eq("listing_id", id);
    checked(count.error);
    if (count.count === null)
      throw new AccessError(
        503,
        "unknown_count",
        "Unable to check image limits.",
      );
    if (count.count >= 5)
      throw new AccessError(
        400,
        "image_limit",
        "A listing can have at most five images.",
      );
  }
  const key = crypto.randomUUID(),
    extension =
      mime === "application/pdf"
        ? "pdf"
        : mime === "image/png"
          ? "png"
          : mime === "image/webp"
            ? "webp"
            : "jpg";
  const intent: Intent = {
    key,
    user: state.user.id,
    kind: kind as Intent["kind"],
    target: id,
    path:
      (kind === "listing"
        ? state.user.id + "/" + id
        : id + "/" + state.user.id) +
      "/" +
      key +
      "." +
      extension,
    mime,
    created: Date.now(),
  };
  // Intent reaches the browser before any file is uploaded, including lost responses.
  context.cookies.set(
    cookieName(key),
    JSON.stringify(intent),
    options(context),
  );
  return json({ key, target_id: id });
}
export async function readMultipart(request: Request): Promise<FormData> {
  const contentType = request.headers.get("content-type") ?? "";
  if (
    request.headers.get("origin") !== new URL(request.url).origin ||
    request.headers.get("sec-fetch-site") === "cross-site" ||
    !contentType.toLowerCase().startsWith("multipart/form-data;")
  )
    throw new AccessError(
      403,
      "invalid_origin",
      "Uploads must come from this website.",
    );
  const limit = 10 * 1024 * 1024 + 65536;
  if (Number(request.headers.get("content-length")) > limit)
    throw new AccessError(413, "file_size", "This upload is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "invalid_upload", "Choose a file.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new AccessError(413, "file_size", "This upload is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return await new Response(bytes, {
      headers: { "Content-Type": contentType },
    }).formData();
  } catch {
    throw new AccessError(400, "invalid_upload", "The upload is invalid.");
  }
}
export async function attachUpload(context: APIContext, form: FormData) {
  const state = await requireWorkspace(context),
    key = form.get("key");
  const recorded = journal(context, state.user.id).find(
    (entry) => entry.key === key,
  );
  const file = form.get("file");
  if (!(file instanceof File) || form.getAll("file").length !== 1)
    throw new AccessError(400, "invalid_upload", "Choose one file.");
  const kind = form.get("kind"),
    id = Number(form.get("target_id"));
  const extension =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
  const candidate = {
    user: state.user.id,
    kind: kind as Intent["kind"],
    target: id,
    key,
    mime: file.type,
    created: Date.now(),
    path:
      (kind === "listing"
        ? state.user.id + "/" + id
        : id + "/" + state.user.id) +
      "/" +
      key +
      "." +
      extension,
  };
  const intent =
    recorded ?? (ownedIntent(candidate, state.user.id) ? candidate : undefined);
  if (!intent || Date.now() - intent.created > 7 * 86400000)
    throw new AccessError(409, "upload_expired", "Prepare this upload again.");
  // A committed document can still be reconciled after the deal completes.
  if (intent.kind === "deal")
    await dealBundle(state, intent.target, form.get("company_id"));
  else await target(state, intent, form.get("company_id"));
  if (
    file.type !== intent.mime ||
    file.name.length > (intent.kind === "deal" ? 255 : 200)
  )
    throw new AccessError(
      400,
      "file_type",
      "The file changed. Prepare it again.",
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  validateFile(bytes, intent.mime, intent.kind);
  const documentType = String(form.get("document_type") ?? "other");
  if (
    intent.kind === "document" &&
    !documentTypes.includes(documentType as (typeof documentTypes)[number])
  )
    throw new AccessError(400, "document_type", "Choose a document type.");
  const bucket = uploadBucket(intent.kind);
  const existing =
    intent.kind === "listing"
      ? await state.client
          .from("listing_images")
          .select("id")
          .eq("listing_id", intent.target)
          .eq("image_url", intent.path)
          .maybeSingle()
      : intent.kind === "enquiry"
        ? await state.client
            .from("enquiry_attachments")
            .select("id")
            .eq("enquiry_id", intent.target)
            .eq("storage_path", intent.path)
            .maybeSingle()
        : intent.kind === "deal"
          ? await state.client
              .from("deal_documents")
              .select("id,deal_id,file_name,file_mime_type,file_size_bytes")
              .eq("deal_id", intent.target)
              .eq("storage_path", intent.path)
              .maybeSingle()
          : intent.kind === "message"
            ? await state.client
                .from("message_attachments")
                .select("id")
                .eq("file_url", intent.path)
                .maybeSingle()
            : await state.client
                .from("verification_documents")
                .select("id")
                .eq("company_verification_id", intent.target)
                .eq("file_url", intent.path)
                .maybeSingle();
  checked(existing.error);
  if (existing.data) {
    if (intent.kind === "deal") {
      const row = existing.data as {
        deal_id?: number;
        file_name?: string;
        file_mime_type?: string;
        file_size_bytes?: number;
      };
      if (
        row.deal_id !== intent.target ||
        row.file_name !== file.name ||
        row.file_mime_type !== intent.mime ||
        row.file_size_bytes !== bytes.length
      )
        throw new AccessError(
          409,
          "document_unconfirmed",
          "Refresh this deal before retrying the document.",
        );
    }
    context.cookies.delete(cookieName(intent.key), options(context));
    return json({ id: existing.data.id, attached: true });
  }
  if (intent.kind === "deal")
    await editableDeal(state, intent.target, form.get("company_id"));
  if (!recorded)
    throw new AccessError(409, "upload_expired", "Prepare this upload again.");
  let displayOrder = 0;
  if (intent.kind === "listing") {
    const images = await state.client
      .from("listing_images")
      .select("id,display_order")
      .eq("listing_id", intent.target);
    checked(images.error);
    if ((images.data?.length ?? 0) >= 5)
      throw new AccessError(
        400,
        "image_limit",
        "A listing can have at most five images.",
      );
    displayOrder = images.data?.length
      ? Math.max(...images.data.map((row) => row.display_order)) + 1
      : 0;
  }
  const upload = await state.client.storage
    .from(bucket)
    .upload(intent.path, bytes, {
      contentType: intent.mime,
      cacheControl: "300",
      upsert: false,
    });
  if (upload.error) {
    if (
      !["409", "Duplicate"].includes(
        String("statusCode" in upload.error ? upload.error.statusCode : ""),
      )
    )
      checked(upload.error);
    // A repeated request can reconcile an uploaded but unattached object only if
    // it contains exactly the same bytes. Never overwrite retained business files.
    const stored = await state.client.storage
      .from(bucket)
      .download(intent.path);
    checked(stored.error);
    if (!stored.data)
      throw new AccessError(
        503,
        "upload_unknown",
        "The upload cannot be confirmed.",
      );
    const digest = async (buffer: ArrayBuffer) =>
      Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
      ).join(",");
    if (
      (await digest(await stored.data.arrayBuffer())) !==
      (await digest(bytes.buffer as ArrayBuffer))
    )
      throw new AccessError(
        409,
        "file_changed",
        "The existing upload differs. Choose a fresh file.",
      );
  }
  if (intent.kind === "listing")
    checked(
      (
        await state.client.from("listing_images").insert({
          listing_id: intent.target,
          image_url: intent.path,
          alt_text: file.name,
          display_order: displayOrder,
          is_primary: displayOrder === 0,
        })
      ).error,
    );
  else if (intent.kind === "enquiry")
    checked(
      (
        await state.client.from("enquiry_attachments").insert({
          enquiry_id: intent.target,
          uploaded_by_user_id: state.user.id,
          storage_path: intent.path,
          file_name: file.name,
          file_mime_type: intent.mime,
          file_size_bytes: bytes.length,
        })
      ).error,
    );
  else if (intent.kind === "message") {
    const messageId = await sendText(
      state,
      intent.target,
      form.get("company_id"),
      requestId(intent.key),
      "",
      "attachment",
    );
    // Same upload key identifies both the message and attachment across a partial failure.
    await attachMessageMetadata(state, {
      message_id: messageId,
      file_url: intent.path,
      file_name: file.name,
      file_mime_type: intent.mime,
      file_size_bytes: bytes.length,
    });
  } else if (intent.kind === "deal") {
    checked(
      (
        await state.client
          .from("deal_documents")
          .upsert(
            {
              deal_id: intent.target,
              uploaded_by_user_id: state.user.id,
              storage_path: intent.path,
              file_name: file.name,
              file_mime_type: intent.mime,
              file_size_bytes: bytes.length,
            },
            { onConflict: "storage_path", ignoreDuplicates: true },
          )
      ).error,
    );
    const confirmed = await state.client
      .from("deal_documents")
      .select("id,deal_id,file_name,file_mime_type,file_size_bytes")
      .eq("storage_path", intent.path)
      .maybeSingle();
    checked(confirmed.error);
    if (
      !confirmed.data ||
      confirmed.data.deal_id !== intent.target ||
      confirmed.data.file_name !== file.name ||
      confirmed.data.file_mime_type !== intent.mime ||
      confirmed.data.file_size_bytes !== bytes.length
    )
      throw new AccessError(
        409,
        "document_unconfirmed",
        "Refresh this deal before retrying the document.",
      );
  } else
    checked(
      (
        await state.client.from("verification_documents").insert({
          company_verification_id: intent.target,
          document_type: documentType,
          file_url: intent.path,
          file_name: file.name,
          file_mime_type: intent.mime,
          file_size_bytes: bytes.length,
          status: "uploaded",
        })
      ).error,
    );
  context.cookies.delete(cookieName(intent.key), options(context));
  return json({ attached: true, message: "File attached." });
}

export async function attachMessageMetadata(
  state: Workspace,
  attachment: {
    message_id: number;
    file_url: string;
    file_name: string;
    file_mime_type: string;
    file_size_bytes: number;
  },
) {
  checked(
    (
      await state.client.from("message_attachments").upsert(attachment, {
        onConflict: "file_url",
        ignoreDuplicates: true,
      })
    ).error,
  );
  const result = await state.client
    .from("message_attachments")
    .select("id,message_id,file_name,file_mime_type,file_size_bytes")
    .eq("file_url", attachment.file_url)
    .maybeSingle();
  checked(result.error);
  if (
    !result.data ||
    result.data.message_id !== attachment.message_id ||
    result.data.file_name !== attachment.file_name ||
    result.data.file_mime_type !== attachment.file_mime_type ||
    result.data.file_size_bytes !== attachment.file_size_bytes
  )
    throw new AccessError(
      409,
      "attachment_unconfirmed",
      "This file could not be confirmed on the same message. Refresh before retrying.",
    );
  return result.data.id;
}
export async function recoverUploads(context: APIContext) {
  const state = await requireWorkspace(context);
  let remaining = 0;
  for (const intent of journal(context, state.user.id)) {
    if (Date.now() - intent.created < 86400000) {
      remaining++;
      continue;
    }
    try {
      const bucket = uploadBucket(intent.kind);
      let result = await state.client.rpc("claim_upload_cleanup", {
        p_bucket: bucket,
        p_path: intent.path,
      });
      checked(result.error);
      if (result.data === "claimed") {
        checked(
          (await state.client.storage.from(bucket).remove([intent.path])).error,
        );
        result = await state.client.rpc("claim_upload_cleanup", {
          p_bucket: bucket,
          p_path: intent.path,
        });
        checked(result.error);
      }
      if (result.data === "gone" || result.data === "retained")
        context.cookies.delete(cookieName(intent.key), options(context));
      else remaining++;
    } catch {
      remaining++;
    }
  }
  return json({ remaining });
}
export async function removeDocument(
  context: APIContext,
  input: Record<string, unknown>,
) {
  const state = await requireWorkspace(context);
  companyManager(state, input.company_id);
  const id = positiveId(input.document_id);
  const result = await state.client
    .from("verification_documents")
    .select("id,company_verification_id,file_url")
    .eq("id", id)
    .maybeSingle();
  checked(result.error);
  if (!result.data)
    throw new AccessError(
      404,
      "record_unavailable",
      "This document is unavailable.",
    );
  await editableVerification(
    state,
    result.data.company_verification_id,
    input.company_id,
  );
  if (input.confirm !== "REMOVE")
    throw new AccessError(
      400,
      "confirmation_required",
      "Confirm document removal.",
    );
  // Remove the authorized metadata first; claim then protects any surviving refs.
  const deleted = await state.client
    .from("verification_documents")
    .delete()
    .eq("id", id)
    .select("id");
  checked(deleted.error);
  if (!deleted.data?.length)
    throw new AccessError(
      409,
      "verification_locked",
      "Document removal could not be confirmed.",
    );
  let cleaned = false;
  try {
    const claim = await state.client.rpc("claim_upload_cleanup", {
      p_bucket: "company-verification-documents",
      p_path: result.data.file_url,
    });
    checked(claim.error);
    if (claim.data === "claimed") {
      checked(
        (
          await state.client.storage
            .from("company-verification-documents")
            .remove([result.data.file_url])
        ).error,
      );
      const confirmed = await state.client.rpc("claim_upload_cleanup", {
        p_bucket: "company-verification-documents",
        p_path: result.data.file_url,
      });
      cleaned = !confirmed.error && confirmed.data === "gone";
    } else cleaned = claim.data === "gone" || claim.data === "retained";
  } catch {}
  return json({
    redirect: cleaned ? "/app/company" : "/app/company?notice=storage-cleanup",
    message: cleaned
      ? "Document removed."
      : "Document removed from verification; storage cleanup could not be confirmed.",
  });
}

export function uploadBucket(kind: Intent["kind"]) {
  return kind === "listing"
    ? "listing-images"
    : kind === "document"
      ? "company-verification-documents"
      : kind === "enquiry"
        ? "enquiry-attachments"
        : kind === "deal"
          ? "deal-documents"
          : "message-attachments";
}
export async function removeEnquiryFile(
  context: APIContext,
  input: Record<string, unknown>,
) {
  const state = await requireWorkspace(context),
    id = positiveId(input.attachment_id);
  const row = await state.client
    .from("enquiry_attachments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  checked(row.error);
  if (!row.data)
    throw new AccessError(404, "file_unavailable", "This file is unavailable.");
  const e = await enquiry(state, row.data.enquiry_id);
  buyer(state, e, input.company_id);
  if (input.confirm !== "REMOVE")
    throw new AccessError(
      400,
      "confirmation_required",
      "Confirm file removal.",
    );
  const deleted = await state.client
    .from("enquiry_attachments")
    .delete()
    .eq("id", id)
    .select("id");
  checked(deleted.error);
  if (!deleted.data?.length)
    throw new AccessError(
      409,
      "file_unavailable",
      "File removal could not be confirmed.",
    );
  // Existing atomic claim protects files that are still referenced elsewhere.
  const bucket = "enquiry-attachments",
    path = row.data.storage_path;
  let cleaned = false;
  try {
    const claim = await state.client.rpc("claim_upload_cleanup", {
      p_bucket: bucket,
      p_path: path,
    });
    checked(claim.error);
    if (claim.data === "claimed") {
      checked((await state.client.storage.from(bucket).remove([path])).error);
      const confirmed = await state.client.rpc("claim_upload_cleanup", {
        p_bucket: bucket,
        p_path: path,
      });
      cleaned = !confirmed.error && confirmed.data === "gone";
    } else cleaned = ["gone", "retained"].includes(claim.data ?? "");
  } catch {}
  return json({
    redirect:
      "/app/enquiries/" + e.id + (cleaned ? "" : "?notice=storage-cleanup"),
  });
}
