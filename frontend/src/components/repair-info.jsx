"use client";

import React, { useState, useEffect } from "react";
import { Text } from "@/components/text";
import { DescriptionList, DescriptionTerm, DescriptionDetails } from "@/components/description-list";
import { Badge } from "@/components/badge";
import { Loader2 } from "lucide-react";

export function RepairInfo({ srNumber }) {
  const [repairData, setRepairData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchRepair() {
      setLoading(true);
      try {
        const response = await fetch(`/api/repair/${srNumber}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch repair info: ${response.statusText}`);
        }
        const data = await response.json();
        setRepairData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (srNumber) {
      fetchRepair();
    }
  }, [srNumber]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 text-zinc-500">
        <Loader2 className="size-4 animate-spin" />
        <span>Loading repair details...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-sm text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!repairData) return null;

  return (
    <div className="space-y-4 rounded-lg border border-zinc-100 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-800/30">
      <div>
        <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Problem Summary</Text>
        <div className="mt-1 text-base font-medium text-zinc-950 dark:text-white">{repairData.problem_summary}</div>
      </div>

      <DescriptionList>
        <DescriptionTerm>SR Number</DescriptionTerm>
        <DescriptionDetails>{repairData.sr_number}</DescriptionDetails>

        <DescriptionTerm>Part Number (RNSN)</DescriptionTerm>
        <DescriptionDetails>
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-700">{repairData.part_number}</code>
        </DescriptionDetails>

        <DescriptionTerm>Service Type</DescriptionTerm>
        <DescriptionDetails>{repairData.service_request_type}</DescriptionDetails>

        <DescriptionTerm>Activity</DescriptionTerm>
        <DescriptionDetails>{repairData.service_activity}</DescriptionDetails>

        <DescriptionTerm>Status</DescriptionTerm>
        <DescriptionDetails>
          <Badge color="zinc">{repairData.job_status_code}</Badge>
        </DescriptionDetails>
      </DescriptionList>
    </div>
  );
}
