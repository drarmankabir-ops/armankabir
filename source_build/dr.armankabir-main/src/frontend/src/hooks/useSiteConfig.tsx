/**
 * Site Config Hook — PHP/MySQL Backend
 *
 * Site configuration is stored server-side via the PHP API.
 * No localStorage used — config is fetched via React Query hooks.
 * Managed via landingService on the server.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { landingService } from "../services/landing";
import type {
  AboutSection,
  EmergencyContact,
  FAQsSection,
  FooterSection,
  GallerySection,
  HeroSection,
  SiteConfig,
  SiteConfigPatch,
  TestimonialsSection,
} from "../services/landing";

export const EMPTY_SITE_CONFIG: SiteConfig = {
  heroSection: {
    taglineEn: "",
    taglineBn: "",
    subheadingEn: "",
    subheadingBn: "",
    heroTaglineEn: "",
    heroTaglineBn: "",
    heroDescriptionEn: "",
    heroDescriptionBn: "",
    cta1Label: "",
    cta1LabelBn: "",
    cta2Label: "",
    cta2LabelBn: "",
  },
  aboutSection: {
    visible: false,
    clinicNameEn: "",
    clinicNameBn: "",
    descriptionEn: "",
    descriptionBn: "",
    yearsExperience: 0,
    patientCount: "",
    doctorCount: 0,
    specialties: [],
    specialtiesBn: [],
    affiliations: [],
    affiliationsBn: [],
  },
  footerSection: {
    addressEn: "",
    addressBn: "",
    phone: "",
    email: "",
    openingHours: "",
    openingHoursBn: "",
    copyrightText: "",
    copyrightTextBn: "",
    socialLinks: [],
  },
  emergencyContacts: [],
  testimonialsSection: {
    heading: "",
    testimonials: [],
  },
  gallerySection: {
    heading: "",
    photos: [],
  },
  faqsSection: {
    heading: "",
    faqs: [],
  },
  doctorContentOverrides: {},
};

export type SiteConfigSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

function mergeConfigPatch(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    const current = merged[key];
    if (
      value && typeof value === "object" && !Array.isArray(value) &&
      current && typeof current === "object" && !Array.isArray(current)
    ) {
      merged[key] = { ...current, ...value };
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

function withSiteConfigDefaults(config: SiteConfig | null): SiteConfig {
  return {
    ...EMPTY_SITE_CONFIG,
    ...config,
    heroSection: {
      ...EMPTY_SITE_CONFIG.heroSection,
      ...(config?.heroSection ?? {}),
    },
    aboutSection: {
      ...EMPTY_SITE_CONFIG.aboutSection,
      ...(config?.aboutSection ?? {}),
      specialties: Array.isArray(config?.aboutSection?.specialties) ? config.aboutSection.specialties : [],
      specialtiesBn: Array.isArray(config?.aboutSection?.specialtiesBn) ? config.aboutSection.specialtiesBn : [],
      affiliations: Array.isArray(config?.aboutSection?.affiliations) ? config.aboutSection.affiliations : [],
      affiliationsBn: Array.isArray(config?.aboutSection?.affiliationsBn) ? config.aboutSection.affiliationsBn : [],
    },
    footerSection: {
      ...EMPTY_SITE_CONFIG.footerSection,
      ...(config?.footerSection ?? {}),
    },
    emergencyContacts: Array.isArray(config?.emergencyContacts)
      ? config.emergencyContacts
      : EMPTY_SITE_CONFIG.emergencyContacts,
    testimonialsSection: {
      ...EMPTY_SITE_CONFIG.testimonialsSection,
      ...(config?.testimonialsSection ?? {}),
      testimonials: Array.isArray(config?.testimonialsSection?.testimonials)
        ? config.testimonialsSection.testimonials
        : EMPTY_SITE_CONFIG.testimonialsSection.testimonials,
    },
    gallerySection: {
      ...EMPTY_SITE_CONFIG.gallerySection,
      ...(config?.gallerySection ?? {}),
      photos: Array.isArray(config?.gallerySection?.photos)
        ? config.gallerySection.photos
        : EMPTY_SITE_CONFIG.gallerySection.photos,
    },
    faqsSection: {
      ...EMPTY_SITE_CONFIG.faqsSection,
      ...(config?.faqsSection ?? {}),
      faqs: Array.isArray(config?.faqsSection?.faqs)
        ? config.faqsSection.faqs
        : EMPTY_SITE_CONFIG.faqsSection.faqs,
    },
    doctorContentOverrides: config?.doctorContentOverrides ?? {},
  };
}

export function useSiteConfig() {
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<SiteConfigSaveStatus>("idle");
  const pendingPatch = useRef<SiteConfigPatch>({});
  const saveWaiters = useRef<Array<{ resolve: () => void; reject: (error: unknown) => void }>>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const mounted = useRef(true);

  const {
    data: loadedConfig,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["siteConfig"],
    queryFn: () => landingService.getSiteConfig(),
  });
  const config = withSiteConfigDefaults(loadedConfig ?? null);
  const configRef = useRef(config);
  configRef.current = config;

  const flushSaves = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const patch = pendingPatch.current;
    if (Object.keys(patch).length === 0) return;
    pendingPatch.current = {};
    const waiters = saveWaiters.current.splice(0);
    if (mounted.current) setSaveStatus("saving");

    saveQueue.current = saveQueue.current.then(async () => {
      try {
        await landingService.updateSiteConfig(patch);
        waiters.forEach(({ resolve }) => resolve());
        if (Object.keys(pendingPatch.current).length === 0) {
          await queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
          if (mounted.current) setSaveStatus("saved");
        }
      } catch (saveError) {
        pendingPatch.current = mergeConfigPatch(patch, pendingPatch.current) as SiteConfigPatch;
        waiters.forEach(({ reject }) => reject(saveError));
        if (mounted.current) {
          setSaveStatus("error");
          toast.error(
            `Could not save front-page content: ${saveError instanceof Error ? saveError.message : "Please try again."}`,
          );
        }
      }
    });
  }, [queryClient]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      flushSaves();
    };
  }, [flushSaves]);

  const scheduleSave = useCallback((patch: SiteConfigPatch): Promise<void> => {
    pendingPatch.current = mergeConfigPatch(pendingPatch.current, patch) as SiteConfigPatch;
    const cached = queryClient.getQueryData<SiteConfig | null>(["siteConfig"]);
    queryClient.setQueryData(
      ["siteConfig"],
      mergeConfigPatch(cached ?? configRef.current, patch) as SiteConfig,
    );
    if (mounted.current) setSaveStatus("pending");

    const promise = new Promise<void>((resolve, reject) => {
      saveWaiters.current.push({ resolve, reject });
    });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSaves, 500);
    return promise;
  }, [flushSaves, queryClient]);

  const updateHero = useCallback(
    (hero: Partial<HeroSection>) => {
      void scheduleSave({ heroSection: hero }).catch(() => undefined);
    },
    [scheduleSave],
  );

  const updateAbout = useCallback(
    (about: Partial<AboutSection>) => {
      void scheduleSave({ aboutSection: about }).catch(() => undefined);
    },
    [scheduleSave],
  );

  const updateFooter = useCallback(
    (footer: Partial<FooterSection>) => {
      void scheduleSave({ footerSection: footer }).catch(() => undefined);
    },
    [scheduleSave],
  );

  const updateEmergencyContacts = useCallback(
    (contacts: EmergencyContact[]) => {
      void scheduleSave({ emergencyContacts: contacts }).catch(() => undefined);
    },
    [scheduleSave],
  );

  const updateTestimonials = useCallback(
    (section: Partial<TestimonialsSection>) =>
      scheduleSave({ testimonialsSection: section }),
    [scheduleSave],
  );

  const updateGallery = useCallback(
    (section: Partial<GallerySection>) =>
      scheduleSave({ gallerySection: section }),
    [scheduleSave],
  );

  const updateFAQs = useCallback(
    (section: Partial<FAQsSection>) =>
      scheduleSave({ faqsSection: section }),
    [scheduleSave],
  );

  const resetSection = useCallback(
    async (section: keyof SiteConfig) => {
      try {
        const defaults = await landingService.getDefaultSiteConfig();
        await scheduleSave({ [section]: defaults[section] });
      } catch (resetError) {
        toast.error(resetError instanceof Error ? resetError.message : "Could not load default content.");
      }
    },
    [scheduleSave],
  );

  return {
    config,
    updateHero,
    updateAbout,
    updateFooter,
    updateEmergencyContacts,
    updateTestimonials,
    updateGallery,
    updateFAQs,
    resetSection,
    isLoading,
    isError,
    error,
    saveStatus,
    isSaving: saveStatus === "pending" || saveStatus === "saving",
  };
}
