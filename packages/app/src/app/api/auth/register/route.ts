import { clientIp } from "@/server/http/client-ip";
import { apiHandler } from "@/server/http/api-handler";
import { readJsonBody } from "@/server/http/read-json";
import { registerAccount } from "@/server/auth/auth-use-cases";
import { serializeSessionCookie } from "@/server/auth/session-cookie";

export type AuthResult = { signedIn: true };

export const POST = apiHandler<AuthResult>("auth.register", async ({ request, scope, logger }) => {
  const ip = clientIp(request.headers, scope.resolve("env").auth.trustedProxy);
  const session = await registerAccount(scope, await readJsonBody(request), ip, logger);
  return {
    data: { signedIn: true },
    status: 201,
    setCookies: [serializeSessionCookie(session.token, session.expiresAt, scope.resolve("secureCookies"))],
  };
});
