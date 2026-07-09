import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export async function uploadAttachment(file: File | null, folder: string) {
  if (!file || file.size === 0) return null;
  if (!allowedTypes.has(file.type)) {
    throw new Error("Tipe file tidak didukung. Gunakan jpeg, png, webp, pdf, word, atau excel.");
  }

  const bucket = process.env.BACKBLAZE_BUCKET;
  if (!bucket) throw new Error("BACKBLAZE_BUCKET belum dikonfigurasi.");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const body = Buffer.from(await file.arrayBuffer());

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
