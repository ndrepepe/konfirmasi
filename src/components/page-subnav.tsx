import { List, PencilLine } from "lucide-react";
import Link from "next/link";

export type PageView = "input" | "data";

export function PageSubnav({
  baseHref,
  activeView,
  showInput = true,
}: {
  baseHref: string;
  activeView: PageView;
  showInput?: boolean;
}) {
  return (
    <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200" aria-label="Sub menu">
      {showInput ? (
        <Link
          href={`${baseHref}?view=input`}
          aria-current={activeView === "input" ? "page" : undefined}
          className={
            activeView === "input"
              ? "inline-flex h-11 shrink-0 items-center gap-2 border-b-2 border-teal-700 px-3 text-sm font-semibold text-teal-700"
              : "inline-flex h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-950"
          }
        >
          <PencilLine className="h-4 w-4" aria-hidden="true" />
          Input Data
        </Link>
      ) : null}
      <Link
        href={`${baseHref}?view=data`}
        aria-current={activeView === "data" ? "page" : undefined}
        className={
          activeView === "data"
            ? "inline-flex h-11 shrink-0 items-center gap-2 border-b-2 border-teal-700 px-3 text-sm font-semibold text-teal-700"
            : "inline-flex h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-medium text-slate-600 hover:border-slate-300 hover:text-slate-950"
        }
      >
        <List className="h-4 w-4" aria-hidden="true" />
        Daftar Data
      </Link>
    </nav>
  );
}
