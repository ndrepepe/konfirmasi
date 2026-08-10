"use client";

import { useState } from "react";

export function PemenuhanPoForm({
  action,
  hardRedirectAfterSuccess,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  hardRedirectAfterSuccess: boolean;
  children: React.ReactNode;
}) {
  const [error, setError] = useState("");

  if (!hardRedirectAfterSuccess) {
    return (
      <form action={action} className="grid gap-4">
        {children}
      </form>
    );
  }

  async function submit(formData: FormData) {
    setError("");
    try {
      await action(formData);
      window.location.assign("/pemenuhan-po?view=data&created=1");
    } catch {
      setError("Data Konfirmasi PO gagal disimpan. Silakan periksa data dan coba lagi.");
    }
  }

  return (
    <form action={submit} className="grid gap-4">
      {children}
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      ) : null}
    </form>
  );
}
