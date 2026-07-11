"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function NavPrefetcher({ hrefs }: { hrefs: string[] }) {
  const router = useRouter();
  const hrefKey = hrefs.join("|");

  useEffect(() => {
    hrefKey.split("|").forEach((href) => {
      if (href) router.prefetch(href);
    });
  }, [hrefKey, router]);

  return null;
}
