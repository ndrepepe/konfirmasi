import { clsx } from "clsx";

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("rounded-md border border-slate-200 bg-white", className)}>
      <div className="border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      </div>
      <div className="min-h-0 flex-1 p-4 sm:p-5 lg:overflow-y-auto">{children}</div>
    </section>
  );
}

export function InputDataLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-5 lg:min-h-[calc(100vh-11rem)] lg:grid-rows-[minmax(0,2fr)_minmax(0,3fr)]">
      {children}
    </div>
  );
}

export function CompactInputDataLayout({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5">{children}</div>;
}

export function Input({
  label,
  name,
  type = "text",
  required = true,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:h-10 sm:text-sm"
      />
    </label>
  );
}

export function Select({
  label,
  name,
  children,
  required = true,
  defaultValue,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-base outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:h-10 sm:text-sm"
      >
        {children}
      </select>
    </label>
  );
}

export function FileInput({
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
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700">
      {label}
      <input
        name={name}
        type="file"
        accept={accept}
        required={required}
        className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-base file:mr-3 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white sm:text-sm"
      />
    </label>
  );
}

export function SubmitButton({ children = "Simpan" }: { children?: React.ReactNode }) {
  return (
    <button className="h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 sm:h-10">
      {children}
    </button>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}
