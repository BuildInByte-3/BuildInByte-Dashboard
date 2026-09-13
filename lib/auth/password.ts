import "server-only";
import { hash, verify } from "@node-rs/argon2";

const options = {
  algorithm: 2 as const,
  memoryCost: 19456,
  timeCost: 3,
  parallelism: 1,
  outputLen: 32,
};

export function hashPassword(password: string) {
  return hash(password, options);
}

export function verifyPassword(hashValue: string, password: string) {
  return verify(hashValue, password, options);
}
