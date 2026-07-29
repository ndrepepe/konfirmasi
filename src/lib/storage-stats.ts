import "server-only";
import { readdir, stat, statfs } from "node:fs/promises";
import path from "node:path";

export type AttachmentUsage = {
  fileCount: number;
  totalBytes: number;
};

export type DiskUsage = {
  path: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercentage: number;
};

export type StorageOverview = {
  attachments: AttachmentUsage | null;
  hdd: DiskUsage | null;
  ssd: DiskUsage | null;
};

let cachedOverview:
  | {
      expiresAt: number;
      value: StorageOverview;
    }
  | undefined;

async function readAttachmentUsage(root: string): Promise<AttachmentUsage> {
  let fileCount = 0;
  let totalBytes = 0;

  async function visit(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(entryPath);
      } else if (entry.isFile()) {
        const fileStat = await stat(entryPath);
        fileCount += 1;
        totalBytes += fileStat.size;
      }
    }
  }

  await visit(root);
  return { fileCount, totalBytes };
}

async function readDiskUsage(targetPath: string): Promise<DiskUsage> {
  const filesystem = await statfs(targetPath, { bigint: true });
  const totalBytes = Number(filesystem.blocks * filesystem.bsize);
  const usedBytes = Number((filesystem.blocks - filesystem.bfree) * filesystem.bsize);
  const availableBytes = Number(filesystem.bavail * filesystem.bsize);
  const usedPercentage =
    totalBytes > 0 ? Math.min(100, Math.max(0, (usedBytes / totalBytes) * 100)) : 0;

  return {
    path: targetPath,
    totalBytes,
    usedBytes,
    availableBytes,
    usedPercentage,
  };
}

async function safely<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch {
    return null;
  }
}

export async function getStorageOverview(): Promise<StorageOverview> {
  if (cachedOverview && cachedOverview.expiresAt > Date.now()) {
    return cachedOverview.value;
  }

  const storagePath = process.env.FILE_STORAGE_PATH;
  const databaseStoragePath = process.env.DATABASE_STORAGE_PATH;
  const [attachments, hdd, ssd] = await Promise.all([
    storagePath ? safely(() => readAttachmentUsage(storagePath)) : Promise.resolve(null),
    storagePath ? safely(() => readDiskUsage(storagePath)) : Promise.resolve(null),
    databaseStoragePath
      ? safely(() => readDiskUsage(databaseStoragePath))
      : Promise.resolve(null),
  ]);

  const value = { attachments, hdd, ssd };
  cachedOverview = {
    expiresAt: Date.now() + 60_000,
    value,
  };
  return value;
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;

  return `${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value)} ${units[unitIndex]}`;
}
