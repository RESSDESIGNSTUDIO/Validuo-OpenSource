import { apiHandler } from "@/server/http/api-handler";
import { signOutUser } from "@/server/auth/auth-use-cases";
import { readSessionToken, serializeClearedSessionCookie } from "@/server/auth/session-cookie";

export const POST = apiHandler<null>("auth.signOut", async ({ request, scope, logger }) => {
  const secure = scope.resolve("secureCookies");
  await signOutUser(scope, readSessionToken(request.headers.get("cookie"), secure), logger);
  return { data: null, setCookies: [serializeClearedSessionCookie(secure)] };
});
