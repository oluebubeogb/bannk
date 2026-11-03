import { devApi, loginWithBasic, ok } from "@/lib/devmode";
export const POST = devApi(async (req, _c, log) => {
  const r = await loginWithBasic(req);
  log.merchant = { apiKeyId: r.key.id, userId: r.key.userId };
  log.summary = "auth.login";
  return ok({ accessToken: r.accessToken, expiresIn: r.expiresIn });
});
