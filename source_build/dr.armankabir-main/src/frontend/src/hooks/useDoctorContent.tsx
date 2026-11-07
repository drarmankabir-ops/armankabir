/**
 * Doctor Content Hook — PHP/MySQL Backend
 *
 * Doctor content is stored server-side via the PHP API.
 * No localStorage used — content is fetched via React Query hooks.
 * Overrides are managed via the landingService on the server.
 */

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doctors } from "../data/doctorsData";
import type { DoctorKey } from "../data/doctorsData";
import { landingService } from "../services/landing";

type BaseDoctorContent = (typeof doctors)[DoctorKey];
type DoctorContent = BaseDoctorContent & {
  classroom: BaseDoctorContent["classroom"] & {
    gallery?: Array<{
      id: string;
      dataUrl: string;
      caption: string;
      category?: string;
    }>;
  };
};

/**
 * Hook to manage doctor content overrides.
 * Fetches content from server-side PHP API on mount.
 */
export function useDoctorContent() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ["siteConfig"],
    queryFn: () => landingService.getSiteConfig(),
  });
  const overrides = config?.doctorContentOverrides ?? {};

  const mutation = useMutation({
    mutationFn: async (
      newOverrides: Record<string, Record<string, unknown>>,
    ) => {
      await landingService.updateSiteConfig({ doctorContentOverrides: newOverrides });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
    },
  });

  const getContent = useCallback(
    (doctorKey: string): DoctorContent => {
      const doctorOverrides = overrides[doctorKey] || {};
      const doctorDefaults = doctors[doctorKey as DoctorKey] || {};
      const phone = doctorOverrides?.phone ?? '';
      const phone2 = doctorOverrides?.phone2 ?? '';
      return {
        ...doctorDefaults,
        ...doctorOverrides,
        name:
          typeof doctorOverrides.name === "string" &&
          doctorOverrides.name.trim()
            ? doctorOverrides.name
            : doctorDefaults.name,
        phone: phone !== '' ? phone : doctorDefaults.phone,
        phone2: phone2 !== '' ? phone2 : doctorDefaults.phone2,
      } as DoctorContent;
    },
    [overrides],
  );

  const updateField = useCallback(
    (doctorKey: string, path: string, value: unknown) => {
      const parts = path.split(".").filter(Boolean);
      if (parts.length === 0) return;
      const doctorOverride = { ...(overrides[doctorKey] ?? {}) };
      const updated = { ...overrides, [doctorKey]: doctorOverride };
      let obj = doctorOverride;
      for (let i = 0; i < parts.length - 1; i++) {
        const existing = obj[parts[i]];
        const child =
          existing && typeof existing === "object" && !Array.isArray(existing)
            ? { ...(existing as Record<string, unknown>) }
            : {};
        obj[parts[i]] = child;
        obj = child;
      }
      obj[parts[parts.length - 1]] = value;
      mutation.mutate(updated);
    },
    [overrides, mutation],
  );

  const updateChambers = useCallback(
    (doctorKey: string, chambers: unknown[]) => {
      const updated = {
        ...overrides,
        [doctorKey]: {
          ...((overrides[doctorKey] as Record<string, unknown>) || {}),
          chambers,
        },
      };
      mutation.mutate(updated);
    },
    [overrides, mutation],
  );

  const getAll = useCallback(() => {
    return overrides;
  }, [overrides]);

  return { getContent, updateField, updateChambers, getAll, isLoading };
}
