"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { clsx } from "clsx";

export function SubmitButton({
  children = "Simpan",
  pendingText = "Memproses...",
  className,
}: {
  children?: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={clsx(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 active:scale-[0.99] disabled:cursor-wait disabled:bg-slate-400 sm:h-10",
        className,
      )}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
