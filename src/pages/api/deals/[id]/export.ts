import type { APIRoute } from "astro";
import inter from "../../../../../public/fonts/Inter.ttf?inline";
import { requireWorkspace } from "../../../../lib/server/access";
import { dealBundle } from "../../../../lib/server/deals";
import { enquiry } from "../../../../lib/server/procurement";
import { checked } from "../../../../lib/server/catalog";
import { dealPdf } from "../../../../lib/server/deal-pdf";
import {
  positiveId,
  errorResponse,
  AccessError,
} from "../../../../lib/security";
export const GET: APIRoute = async (context) => {
  try {
    const state = await requireWorkspace(context),
      id = positiveId(context.params.id),
      bundle = await dealBundle(state, id),
      e = await enquiry(state, bundle.deal.enquiry_id);
    const result = bundle.deal.quote_id
      ? await state.client
          .from("quotes")
          .select("*")
          .eq("id", bundle.deal.quote_id)
          .eq("enquiry_id", e.id)
          .maybeSingle()
      : null;
    if (result) {
      checked(result.error);
      if (!result.data)
        throw new AccessError(
          409,
          "quote_unavailable",
          "The accepted quote is unavailable. Refresh this deal before exporting.",
        );
    }
    const bytes = await dealPdf(
      bundle,
      e,
      result?.data ?? null,
      Uint8Array.from(atob(inter.slice(inter.indexOf(",") + 1)), (c) =>
        c.charCodeAt(0),
      ),
    );
    const inline = context.url.searchParams.get("preview") === "1";
    return new Response(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Disposition":
          (inline ? "inline" : "attachment") +
          '; filename="salam-deal-' +
          id +
          '.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'none'; sandbox; frame-ancestors 'self'",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
};
