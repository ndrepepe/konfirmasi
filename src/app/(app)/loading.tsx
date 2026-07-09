export default function Loading() {
  return (
    <div className="grid gap-5">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded bg-slate-200" />
      </div>
      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="h-72 animate-pulse rounded-md border border-slate-200 bg-white" />
        <div className="h-72 animate-pulse rounded-md border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
