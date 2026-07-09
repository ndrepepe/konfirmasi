"use client";

import { useState } from "react";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxImageSize = 1600;
const imageQuality = 0.78;

function imageName(name: string) {
  return name.replace(/\.[^.]+$/, "") + ".webp";
}

async function imageToBlob(img: HTMLImageElement) {
  const scale = Math.min(1, maxImageSize / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak mendukung kompresi gambar.");
  context.drawImage(img, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Gagal mengompresi gambar."))),
      "image/webp",
      imageQuality,
    );
  });
}

async function compressImage(file: File) {
  if (!imageTypes.has(file.type)) return file;

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const blob = await imageToBlob(img);
    if (blob.size >= file.size) return file;
    return new File([blob], imageName(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function MultiFileInput({
  label,
  name,
  accept,
  required = true,
}: {
  label: string;
  name: string;
  accept: string;
  required?: boolean;
}) {
  const [status, setStatus] = useState("");

  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type="file"
        accept={accept}
        required={required}
        multiple
        onChange={async (event) => {
          const input = event.currentTarget;
          const files = Array.from(input.files ?? []);
          if (!files.length) {
            setStatus("");
            return;
          }

          setStatus("Mengompresi file...");
          const compressed = await Promise.all(files.map(compressImage));
          const transfer = new DataTransfer();
          compressed.forEach((file) => transfer.items.add(file));
          input.files = transfer.files;
          const saved = files.reduce(
            (total, file, index) => total + Math.max(0, file.size - compressed[index].size),
            0,
          );
          const savedMb = saved / 1024 / 1024;
          setStatus(
            saved > 0
              ? `${compressed.length} file siap, hemat ${savedMb.toFixed(2)} MB.`
              : `${compressed.length} file siap.`,
          );
        }}
        className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
      />
      {status ? <span className="text-xs font-normal text-slate-500">{status}</span> : null}
    </label>
  );
}
