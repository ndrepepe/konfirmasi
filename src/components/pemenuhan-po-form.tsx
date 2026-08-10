"use client";

import { useState, type FormEvent } from "react";

type ActionResult = { success: boolean; message?: string } | void;

export function PemenuhanPoForm({
  action,
  hardRedirectAfterSuccess,
  children,
}: {
  action?: (formData: FormData) => Promise<ActionResult>;
  hardRedirectAfterSuccess: boolean;
  children: React.ReactNode;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (!hardRedirectAfterSuccess) {
    async function passthrough(formData: FormData) {
      if (!action) throw new Error("Action update Konfirmasi PO tidak tersedia.");
      await action(formData);
    }

    return (
      <form action={passthrough} className="grid gap-4">
        {children}
      </form>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/pemenuhan-po", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; message?: string }
        | null;

      if (!response.ok || !result?.success) {
        setError(result?.message ?? "Server gagal memproses data Konfirmasi PO.");
        return;
      }
      window.location.assign("/pemenuhan-po?view=data&created=1");
    } catch {
      setError("Data Konfirmasi PO gagal disimpan. Silakan periksa data dan coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </form>
  );
}
