import { importCustomerData } from "@/app/actions/master-data";
import { SubmitButton } from "@/components/submit-button";
import type { Branch } from "@/lib/types";

export function CustomerExcelImporter({ branches: _branches }: { branches: Branch[] }) {
  return (
    <div className="mt-6 border-t border-slate-200 pt-5">
      <a href="/templates/template-data-customer.xlsx" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
        Download template Excel
      </a>
      <form action={importCustomerData} className="mt-4 grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">
          File Excel
          <input
            name="excel_file"
            type="file"
            accept=".xlsx"
            required
            className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-base file:mr-3 file:rounded-md file:border-0 file:bg-teal-700 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white sm:text-sm"
          />
        </label>
        <SubmitButton>Import Excel</SubmitButton>
      </form>
    </div>
  );
}
