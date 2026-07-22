"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/next/api-client";
import { extractWorkers } from "@/lib/next/workers";
import type { Worker } from "@/lib/next/types";

interface WorkerQueryOptions {
  month: number;
  year: number;
  scope?: "all" | "me";
}

export function useWorkers({ month, year, scope = "all" }: WorkerQueryOptions) {
  return useQuery<Worker[]>({
    queryKey: ["workers", scope, month, year],
    queryFn: async () => {
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
        loadCardTurnovers: "true",
        loadCardSales: "true",
        loadCardDetails: "false",
        loadUser: "true",
        loadServiceQuality: "true",
        loadMobileBank: "true",
      });
      const payload = await apiRequest<unknown>(`/api/backend/${scope === "me" ? "worker" : "workers"}?${params}`);
      return extractWorkers(payload);
    },
  });
}
