import { Select } from "@/components/ui";
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
    <Select label="Cabang" name="branch_id">
      <option value="">Pilih cabang</option>
      {options.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.code} - {branch.name}
        </option>
      ))}
    </Select>
  );
}
