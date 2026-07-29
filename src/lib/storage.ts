import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

function getS3Client() {
  const endpoint = process.env.BACKBLAZE_ENDPOINT;
  const region = process.env.BACKBLAZE_REGION ?? "us-west-004";
  const accessKeyId = process.env.BACKBLAZE_KEY_ID;
  const secretAccessKey = process.env.BACKBLAZE_APPLICATION_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("Konfigurasi Backblaze belum lengkap.");
  }

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function useLocalStorage() {
  return process.env.FILE_STORAGE_DRIVER === "local";
}

export function getLocalStorageRoot() {
  const root = process.env.FILE_STORAGE_PATH;
  if (!root) throw new Error("FILE_STORAGE_PATH belum dikonfigurasi.");
  return path.resolve(root);
}

export function resolveLocalStoragePath(key: string) {
  const root = getLocalStorageRoot();
  const normalizedKey = path
    .normalize(key)
    .replace(/^(\.\.[/\\])+/, "")
    .replace(/^[/\\]+/, "");
  const fullPath = path.resolve(root, normalizedKey);

  if (fullPath !== root && !fullPath.startsWith(`${root}${path.sep}`)) {
    throw new Error("Path lampiran tidak valid.");
  }

  return fullPath;
}

export async function uploadAttachment(file: File | null, folder: string) {
  if (!file || file.size === 0) return null;
  if (!allowedTypes.has(file.type)) {
    throw new Error("Tipe file tidak didukung. Gunakan jpeg, png, webp, pdf, word, atau excel.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const body = Buffer.from(await file.arrayBuffer());

  if (useLocalStorage()) {
    const target = resolveLocalStoragePath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);

    return {
      key,
      name: file.name,
      type: file.type,
      size: file.size,
    };
  }

  const bucket = process.env.BACKBLAZE_BUCKET;
  if (!bucket) throw new Error("BACKBLAZE_BUCKET belum dikonfigurasi.");

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: file.type,
    }),
  );

  return {
    key,
    name: file.name,
    type: file.type,
    size: file.size,
  };
}

export async function uploadAttachments(files: File[], folder: string) {
  const uploaded = await Promise.all(
    files
      .filter((file) => file.size > 0)
      .map((file) => uploadAttachment(file, folder)),
  );

  return uploaded.filter(Boolean);
}

export type StoredAttachment = {
  key: string;
  name: string;
  type?: string;
  size?: number;
};

function parseStoredAttachments(value: unknown): StoredAttachment[] {
  let parsed = value;

  for (let depth = 0; depth < 2 && typeof parsed === "string"; depth += 1) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return [];
    }
  }

  const candidates = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" ? [parsed] : [];

  return candidates.filter(
    (file): file is StoredAttachment =>
      typeof file === "object" &&
      file !== null &&
      "key" in file &&
      typeof file.key === "string" &&
      file.key.length > 0 &&
      "name" in file &&
      typeof file.name === "string",
  );
}

export async function getAttachmentUrl(key: string) {
  if (useLocalStorage()) {
    return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  const bucket = process.env.BACKBLAZE_BUCKET;
  if (!bucket) throw new Error("BACKBLAZE_BUCKET belum dikonfigurasi.");

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn: 60 * 10 },
  );
}

export async function getAttachmentLinks(value: unknown) {
  const files = parseStoredAttachments(value);
  return Promise.all(
    files.map(async (file) => ({
      ...file,
      url: await getAttachmentUrl(file.key),
    })),
  );
}
