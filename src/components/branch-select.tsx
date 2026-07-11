import { SearchableSelect } from "@/components/searchable-select";
import { canViewAllBranches, getAssignedBranchIds } from "@/lib/permissions";
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
  const assignedBranchIds = getAssignedBranchIds(profile);
  const options = canViewAllBranches(profile)
    ? branches
    : branches.filter((branch) => assignedBranchIds.includes(branch.id));

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
