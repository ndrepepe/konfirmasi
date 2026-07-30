import "server-only";
import { readFile, readdir, stat, statfs } from "node:fs/promises";
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

export type DiskHealthStatus = "healthy" | "warning" | "critical" | "unavailable";

export type DiskHealth = {
  model: string;
  firmwareVersion?: string | null;
  capacityBytes?: number | null;
  interface?: string | null;
  status: DiskHealthStatus;
  smartPassed: boolean | null;
  temperatureC: number | null;
  powerOnHours: number | null;
  powerCycleCount?: number | null;
  smartErrorCount?: number | null;
  lastSelfTestStatus?: string | null;
  lastSelfTestHours?: number | null;
  reallocatedSectors: number | null;
  pendingSectors: number | null;
  offlineUncorrectable: number | null;
  lifeRemainingPercentage: number | null;
  hostWrites?: string | null;
  hostReads?: string | null;
  hostWritesBytes?: number | null;
  hostReadsBytes?: number | null;
  unsafeShutdowns?: number | null;
  crcErrorCount?: number | null;
  commandTimeouts?: number | null;
};

export type DiskHealthOverview = {
  updatedAt: string;
  hdd: DiskHealth;
  ssd: DiskHealth;
  dataSsd?: DiskHealth;
};

export type StorageOverview = {
  attachments: AttachmentUsage | null;
  hdd: DiskUsage | null;
  ssd: DiskUsage | null;
  diskHealth: DiskHealthOverview | null;
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

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isOptionalNullableNumber(value: unknown) {
  return value === undefined || isNullableNumber(value);
}

function isOptionalNullableString(value: unknown) {
  return value === undefined || value === null || typeof value === "string";
}

function isDiskHealth(value: unknown): value is DiskHealth {
  if (!value || typeof value !== "object") return false;
  const health = value as Record<string, unknown>;
  return (
    typeof health.model === "string" &&
    isOptionalNullableString(health.firmwareVersion) &&
    isOptionalNullableNumber(health.capacityBytes) &&
    isOptionalNullableString(health.interface) &&
    ["healthy", "warning", "critical", "unavailable"].includes(String(health.status)) &&
    (health.smartPassed === null || typeof health.smartPassed === "boolean") &&
    isNullableNumber(health.temperatureC) &&
    isNullableNumber(health.powerOnHours) &&
    isOptionalNullableNumber(health.powerCycleCount) &&
    isOptionalNullableNumber(health.smartErrorCount) &&
    isOptionalNullableString(health.lastSelfTestStatus) &&
    isOptionalNullableNumber(health.lastSelfTestHours) &&
    isNullableNumber(health.reallocatedSectors) &&
    isNullableNumber(health.pendingSectors) &&
    isNullableNumber(health.offlineUncorrectable) &&
    isNullableNumber(health.lifeRemainingPercentage) &&
    isOptionalNullableString(health.hostWrites) &&
    isOptionalNullableString(health.hostReads) &&
    isOptionalNullableNumber(health.hostWritesBytes) &&
    isOptionalNullableNumber(health.hostReadsBytes) &&
    isOptionalNullableNumber(health.unsafeShutdowns) &&
    isOptionalNullableNumber(health.crcErrorCount) &&
    isOptionalNullableNumber(health.commandTimeouts)
  );
}

async function readDiskHealth(filePath: string): Promise<DiskHealthOverview> {
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as Record<string, unknown>;
  if (
    typeof parsed.updatedAt !== "string" ||
    !isDiskHealth(parsed.hdd) ||
    !isDiskHealth(parsed.ssd) ||
    (parsed.dataSsd !== undefined && !isDiskHealth(parsed.dataSsd))
  ) {
    throw new Error("Format data kesehatan disk tidak valid.");
  }

  return {
    updatedAt: parsed.updatedAt,
    hdd: parsed.hdd,
    ssd: parsed.ssd,
    dataSsd: parsed.dataSsd as DiskHealth | undefined,
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
  const diskHealthPath =
    process.env.DISK_HEALTH_PATH ?? "/var/lib/konfirmasi/disk-health.json";
  const [attachments, hdd, ssd, diskHealth] = await Promise.all([
    storagePath ? safely(() => readAttachmentUsage(storagePath)) : Promise.resolve(null),
    storagePath ? safely(() => readDiskUsage(storagePath)) : Promise.resolve(null),
    databaseStoragePath
      ? safely(() => readDiskUsage(databaseStoragePath))
      : Promise.resolve(null),
    safely(() => readDiskHealth(diskHealthPath)),
  ]);

  const value = { attachments, hdd, ssd, diskHealth };
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
