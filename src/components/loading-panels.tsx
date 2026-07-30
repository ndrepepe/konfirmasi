import { CompactInputDataLayout, InputDataLayout, Panel } from "@/components/ui";

function Lines({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-md bg-slate-100" />
      ))}
    </div>
  );
}

export function FormPanelSkeleton({ title }: { title: string }) {
  return (
    <Panel title={title} className="flex min-h-0 flex-col">
      <Lines count={5} />
    </Panel>
  );
}

export function DataPanelSkeleton({ title }: { title: string }) {
  return (
    <Panel title={title} className="flex min-h-0 flex-col">
      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_160px]">
        <div className="h-10 animate-pulse rounded-md bg-slate-100" />
        <div className="h-10 animate-pulse rounded-md bg-slate-100" />
        <div className="h-10 animate-pulse rounded-md bg-slate-100" />
      </div>
      <div className="h-40 animate-pulse rounded-md bg-slate-100" />
    </Panel>
  );
}

export function InputDataSkeleton({
  formTitle,
  dataTitle,
  compact = false,
}: {
  formTitle: string;
  dataTitle: string;
  compact?: boolean;
}) {
  const content = (
    <>
      <FormPanelSkeleton title={formTitle} />
      <DataPanelSkeleton title={dataTitle} />
    </>
  );

  return compact ? (
    <CompactInputDataLayout>{content}</CompactInputDataLayout>
  ) : (
    <InputDataLayout>{content}</InputDataLayout>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {["Customer Baru", "Konfirmasi PO", "Penagihan"].map((title) => (
          <Panel key={title} title={title}>
            <div className="h-8 w-16 animate-pulse rounded-md bg-slate-100" />
            <div className="mt-2 h-4 w-32 animate-pulse rounded-md bg-slate-100" />
          </Panel>
        ))}
      </div>
      <Panel title="Profil Akses" className="mt-4">
        <Lines count={3} />
      </Panel>
    </>
  );
}
