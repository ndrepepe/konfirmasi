import { SearchableSelect } from "@/components/searchable-select";
import { canViewAllBranches } from "@/lib/permissions";
import type { Branch, Profile } from "@/lib/types";

export function BranchSelect({
  branches,
  profile,
  defaultValue,
}: {
  branches: Branch[];
  profile: Profile;
  defaultValue?: string;
}) {
  const options = canViewAllBranches(profile)
    ? branches
    : branches.filter((branch) => branch.id === profile.branch_id);

  return (
    <SearchableSelect
      label="Cabang"
      name="branch_id"
      placeholder="Pilih cabang"
      defaultValue={defaultValue}
      options={options.map((branch) => ({
        value: branch.id,
        label: `${branch.code} - ${branch.name}`,
        searchText: `${branch.code} ${branch.name}`,
      }))}
    />
  );
}
