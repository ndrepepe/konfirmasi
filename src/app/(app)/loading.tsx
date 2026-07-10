export default function Loading() {
  return (
    <div className="grid gap-5">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full max-w-lg animate-pulse rounded bg-slate-200" />
      </div>
      <div className="grid min-h-[calc(100vh-11rem)] grid-rows-[minmax(0,2fr)_minmax(0,3fr)] gap-5">
        <div className="min-h-0 animate-pulse rounded-md border border-slate-200 bg-white" />
        <div className="min-h-0 animate-pulse rounded-md border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
