import "server-only";
import { authenticator } from "otplib";
import { decryptSecret } from "@/lib/security/crypto";

authenticator.options = { step: 30, window: 1 };

export function generateMfaSecret() {
  return authenticator.generateSecret();
}

export function mfaUri(email: string, secret: string) {
  return authenticator.keyuri(email, "BuildInByte Admin", secret);
}

export function verifyMfa(encryptedSecret: string, token: string) {
  return authenticator.check(token.replace(/\s/g, ""), decryptSecret(encryptedSecret));
}
