"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const selectedFilesRef = useRef<File[]>([]);

  function syncInputFiles(input: HTMLInputElement, files: File[]) {
    const transfer = new DataTransfer();
    files.forEach((file) => transfer.items.add(file));
    input.files = transfer.files;
    selectedFilesRef.current = files;
    setSelectedFiles(files);
  }

  function removeFile(indexToRemove: number) {
    const input = inputRef.current;
    if (!input) return;
    const nextFiles = selectedFilesRef.current.filter((_, index) => index !== indexToRemove);
    syncInputFiles(input, nextFiles);
    setStatus(nextFiles.length ? `${nextFiles.length} file siap.` : "");
  }

  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <input
        ref={inputRef}
        name={name}
        type="file"
        accept={accept}
        required={required}
        multiple
        onChange={async (event) => {
          const input = event.currentTarget;
          const files = Array.from(input.files ?? []);
          if (!files.length) {
            syncInputFiles(input, selectedFilesRef.current);
            setStatus(
              selectedFilesRef.current.length ? `${selectedFilesRef.current.length} file siap.` : "",
            );
            return;
          }

          setStatus("Mengompresi file...");
          const compressed = await Promise.all(files.map(compressImage));
          const nextFiles = [...selectedFilesRef.current, ...compressed];
          syncInputFiles(input, nextFiles);
          const saved = files.reduce(
            (total, file, index) => total + Math.max(0, file.size - compressed[index].size),
            0,
          );
          const savedMb = saved / 1024 / 1024;
          setStatus(
            saved > 0
              ? `${nextFiles.length} file siap, hemat ${savedMb.toFixed(2)} MB dari pilihan terakhir.`
              : `${nextFiles.length} file siap.`,
          );
        }}
        className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
      />
      {status ? <span className="text-xs font-normal text-slate-500">{status}</span> : null}
      {selectedFiles.length ? (
        <ul className="grid gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-600">
          {selectedFiles.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex min-w-0 items-center justify-between gap-2"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  removeFile(index);
                }}
                className="grid size-6 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                aria-label={`Hapus ${file.name}`}
                title={`Hapus ${file.name}`}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </label>
  );
}
