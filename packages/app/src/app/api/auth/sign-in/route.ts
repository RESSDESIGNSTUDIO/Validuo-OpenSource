import { clientIp } from "@/server/http/client-ip";
import { apiHandler } from "@/server/http/api-handler";
import { readJsonBody } from "@/server/http/read-json";
import { signInUser } from "@/server/auth/auth-use-cases";
import { serializeSessionCookie } from "@/server/auth/session-cookie";

import type { AuthResult } from "../register/route";

export const POST = apiHandler<AuthResult>("auth.signIn", async ({ request, scope, logger }) => {
  const ip = clientIp(request.headers, scope.resolve("env").auth.trustedProxy);
  const session = await signInUser(scope, await readJsonBody(request), ip, logger);
  return {
    data: { signedIn: true },
    setCookies: [serializeSessionCookie(session.token, session.expiresAt, scope.resolve("secureCookies"))],
  };
});
