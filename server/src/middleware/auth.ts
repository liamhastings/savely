import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from "jose";

declare global {
  namespace Express {
    interface Request {
      /** Supabase auth user id (auth.users.id), set by requireAuth. */
      userId: string;
    }
  }
}

// Users live in Supabase Auth. The web app signs in there and sends the session's
// access token as a Bearer token; we only verify it and read the user id from `sub`.
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const issuer = `${supabaseUrl}/auth/v1`;

// Current Supabase projects sign tokens with an asymmetric key published as a JWKS.
const jwks = supabaseUrl
  ? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
  : null;

// Older projects sign with a shared HS256 secret instead (Settings → API → JWT secret).
const legacySecret = process.env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
  : null;

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!jwks) {
    res.status(500).json({ error: "SUPABASE_URL not configured on the server" });
    return;
  }
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "missing token" });
    return;
  }
  try {
    const token = header.slice(7);
    const claims = { issuer, audience: "authenticated" };
    const useLegacy = legacySecret && decodeProtectedHeader(token).alg === "HS256";
    const { payload } = useLegacy
      ? await jwtVerify(token, legacySecret, { ...claims, algorithms: ["HS256"] })
      : await jwtVerify(token, jwks, { ...claims, algorithms: ["ES256", "RS256", "EdDSA"] });
    if (!payload.sub) throw new Error("token has no subject");
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "invalid token" });
  }
}
