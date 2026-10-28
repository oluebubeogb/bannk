import { createHash, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

const SESSION_COOKIE = "bannk_session";
const SESSION_DAYS = 14;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set and at least 16 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * WordKey: a Nigerian-flavoured phrase (cities, peoples, food, names) used for
 * email verification and password reset. Lowercase; matching is case-insensitive.
 * 128 words → no modulo bias with a random byte; 4 words ≈ 28 bits, plus expiry + attempt caps.
 */
export const WORDKEY_VOCAB = [
  "lagos", "abuja", "kaduna", "kano", "enugu", "ibadan", "jos", "owerri", "calabar", "benin",
  "warri", "onitsha", "aba", "ilorin", "sokoto", "zaria", "yola", "uyo", "akure", "abeokuta",
  "osogbo", "makurdi", "lokoja", "minna", "bauchi", "gombe", "katsina", "kebbi", "ekiti",
  "ondo", "oyo", "delta", "anambra", "imo", "ebonyi", "nsukka", "ikeja", "lekki", "yaba",
  "surulere", "ajah", "badagry", "epe", "ikorodu", "asaba", "nnewi", "efik", "ibibio", "igbo",
  "yoruba", "hausa", "tiv", "ijaw", "edo", "urhobo", "itsekiri", "nupe", "kanuri", "fulani",
  "idoma", "igala", "isoko", "jollof", "suya", "egusi", "ogbono", "amala", "eba", "fufu",
  "moimoi", "akara", "puffpuff", "chinchin", "zobo", "kunu", "garri", "yam", "plantain",
  "dodo", "ofada", "ewedu", "gbegiri", "efo", "banga", "nkwobi", "palm", "pepper", "kilishi",
  "masa", "tuwo", "boli", "abacha", "okpa", "agidi", "ogi", "palmwine", "ponmo", "asun",
  "ikenna", "chidi", "ngozi", "emeka", "tunde", "bisi", "kemi", "femi", "amaka", "uche",
  "obinna", "ada", "segun", "funmi", "musa", "aisha", "zainab", "ibrahim", "sade", "chioma",
  "nkechi", "yemi", "dayo", "tobi", "kelechi", "ifeoma", "babajide", "olumide", "nnamdi",
  "halima",
];

export function generateWordKey(): string {
  const words: string[] = [];
  const bytes = randomBytes(4);
  for (let i = 0; i < 4; i++) {
    words.push(WORDKEY_VOCAB[bytes[i] % WORDKEY_VOCAB.length]);
  }
  return words.join("-");
}

/** "Ikenna Kaduna, suya-EFIK" → "ikenna-kaduna-suya-efik" (separators are forgiving). */
export function normalizeWordKey(phrase: string): string {
  return phrase
    .toLowerCase()
    .trim()
    .split(/[\s,._\-]+/)
    .filter(Boolean)
    .join("-");
}

export function hashWordKey(phrase: string): string {
  const pepper = process.env.WORDKEY_PEPPER || "dev-pepper";
  return createHash("sha256").update(normalizeWordKey(phrase) + pepper).digest("hex");
}

export function verifyWordKey(phrase: string, hash: string): boolean {
  const computed = hashWordKey(phrase);
  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  } catch {
    return false;
  }
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt },
  });

  const jwt = await new SignJWT({ sub: userId, sid: tokenHash })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${SESSION_DAYS}d`)
    .setIssuedAt()
    .sign(getSecret());

  return jwt;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.sub as string;
    const tokenHash = payload.sid as string;

    const session = await prisma.session.findFirst({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!session) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user || user.status !== "active") return null;
    return user;
  } catch {
    return null;
  }
}

export async function setSessionCookie(jwt: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function revokeSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const tokenHash = payload.sid as string;
    await prisma.session.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  } catch {
    // ignore
  }
  await clearSessionCookie();
}
