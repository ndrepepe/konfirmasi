"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 active:scale-[0.99] disabled:cursor-wait disabled:opacity-60"
    >
      <Trash2 className="size-3.5" aria-hidden="true" />
      {pending ? "Menghapus..." : "Hapus"}
    </button>
  );
}

export function DeleteButton({
  id,
  action,
  label = "data ini",
}: {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Hapus ${label}?`)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <DeleteSubmitButton />
    </form>
  );
}
