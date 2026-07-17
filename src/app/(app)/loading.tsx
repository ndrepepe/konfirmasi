import { PageHeader } from "@/components/ui";
import { InputDataSkeleton } from "@/components/loading-panels";

export default function Loading() {
  return (
    <>
      <PageHeader title="" description="" />
      <InputDataSkeleton formTitle="" dataTitle="" />
    </>
  );
}
