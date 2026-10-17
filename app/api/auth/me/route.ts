import { jsonSuccess, withApi } from "@/lib/api/handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApi(async (_req, { user, profile }) => {
  return jsonSuccess({
    user,
    profile,
  });
});
