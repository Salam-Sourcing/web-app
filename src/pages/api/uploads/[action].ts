import type { APIRoute } from "astro";
import { requireWorkspace } from "../../../lib/server/access";
import {
  AccessError,
  readMutation,
  errorResponse,
} from "../../../lib/security";
import {
  prepareUpload,
  attachUpload,
  readMultipart,
  recoverUploads,
  removeDocument,
  removeEnquiryFile,
} from "../../../lib/server/uploads";
export const POST: APIRoute = async (context) => {
  try {
    if (context.params.action === "attach") {
      if (context.request.headers.get("origin") !== context.url.origin)
        throw new AccessError(
          403,
          "invalid_origin",
          "Uploads must come from this website.",
        );
      await requireWorkspace(context);
      return await attachUpload(context, await readMultipart(context.request));
    }
    const input = await readMutation(
      context.request,
      context.params.action === "prepare" ? 65536 : 16384,
    );
    if (context.params.action === "prepare")
      return await prepareUpload(context, input);
    if (context.params.action === "recover")
      return await recoverUploads(context);
    if (context.params.action === "remove-enquiry")
      return await removeEnquiryFile(context, input);
    if (context.params.action === "remove-document")
      return await removeDocument(context, input);
    throw new AccessError(
      404,
      "not_found",
      "This upload action is unavailable.",
    );
  } catch (error) {
    return errorResponse(error);
  }
};
