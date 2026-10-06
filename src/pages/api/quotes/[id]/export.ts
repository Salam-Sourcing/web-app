import type { APIRoute } from "astro";
import inter from "../../../../../public/fonts/Inter.ttf?inline";
import { requireWorkspace } from "../../../../lib/server/access";
import { enquiry, companySummaries } from "../../../../lib/server/procurement";
import { checked } from "../../../../lib/server/catalog";
import { quotePdf } from "../../../../lib/server/quote-pdf";
import {
  positiveId,
  errorResponse,
  AccessError,
} from "../../../../lib/security";
export const GET: APIRoute = async (context) => {
  try {
    const state = await requireWorkspace(context),
      id = positiveId(context.params.id),
      e = await enquiry(state, id),
      single = context.url.searchParams.get("quote");
    let q = state.client
      .from("quotes")
      .select("*")
      .eq("enquiry_id", id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (single) q = q.eq("id", positiveId(single));
    const result = await q.limit(501);
    checked(result.error);
    if (!result.data?.length)
      throw new AccessError(
        404,
        "quotes_unavailable",
        "No authorized quotes are available to export.",
      );
    if (result.data.length > 500)
      throw new AccessError(
        413,
        "export_too_large",
        "Export quotes individually for this enquiry with more than 500 quotes.",
      );
    const summaries = await companySummaries(
      state,
      result.data.map((x) => x.supplier_company_id),
    );
    const base64 = inter.slice(inter.indexOf(",") + 1),
      fontBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const bytes = await quotePdf(
      e,
      result.data,
      new Map(summaries.map((x) => [x.id, x.display_name])),
      fontBytes,
    );
    return new Response(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="enquiry-' +
          id +
          (single ? "-quote-" + positiveId(single) : "-quotes") +
          '.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'none'; sandbox; frame-ancestors 'none'",
      },
    });
  } catch (e) {
    return errorResponse(e);
  }
};
