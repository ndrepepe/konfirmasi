import { SearchableSelect } from "@/components/searchable-select";
import { canViewAllBranches } from "@/lib/permissions";
import type { Branch, Profile } from "@/lib/types";

export function BranchSelect({
  branches,
  profile,
}: {
  branches: Branch[];
  profile: Profile;
}) {
  const options = canViewAllBranches(profile)
    ? branches
    : branches.filter((branch) => branch.id === profile.branch_id);

  return (
    <SearchableSelect
      label="Cabang"
      name="branch_id"
      placeholder="Pilih cabang"
      options={options.map((branch) => ({
        value: branch.id,
        label: `${branch.code} - ${branch.name}`,
        searchText: `${branch.code} ${branch.name}`,
      }))}
    />
  );
}
