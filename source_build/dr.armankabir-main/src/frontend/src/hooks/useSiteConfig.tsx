/**
 * Site Config Hook — PHP/MySQL Backend
 *
 * Site configuration is stored server-side via the PHP API.
 * No localStorage used — config is fetched via React Query hooks.
 * Managed via landingService on the server.
 */

import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

  const mutation = useMutation({
    mutationFn: async (updated: Partial<SiteConfig>) => {
      await landingService.updateSiteConfig(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
    },
    onError: (saveError: Error) => {
      toast.error(`Could not save front-page content: ${saveError.message}`);
    },
  });

  const updateHero = useCallback(
    (hero: Partial<HeroSection>) => {
      mutation.mutate({ heroSection: { ...config.heroSection, ...hero } });
    },
    [mutation, config.heroSection],
  );

  const updateAbout = useCallback(
    (about: Partial<AboutSection>) => {
      mutation.mutate({ aboutSection: { ...config.aboutSection, ...about } });
    },
    [mutation, config.aboutSection],
  );

  const updateFooter = useCallback(
    (footer: Partial<FooterSection>) => {
      mutation.mutate({ footerSection: { ...config.footerSection, ...footer } });
    },
    [mutation, config.footerSection],
  );

  const updateEmergencyContacts = useCallback(
    (contacts: EmergencyContact[]) => {
      mutation.mutate({ emergencyContacts: contacts });
    },
    [mutation],
  );

  const updateTestimonials = useCallback(
    (section: Partial<TestimonialsSection>) =>
      mutation.mutateAsync({
        testimonialsSection: { ...config.testimonialsSection, ...section },
      }),
    [mutation, config.testimonialsSection],
  );

  const updateGallery = useCallback(
    (section: Partial<GallerySection>) =>
      mutation.mutateAsync({
        gallerySection: { ...config.gallerySection, ...section },
      }),
    [mutation, config.gallerySection],
  );

  const updateFAQs = useCallback(
    (section: Partial<FAQsSection>) =>
      mutation.mutateAsync({
        faqsSection: { ...config.faqsSection, ...section },
      }),
    [mutation, config.faqsSection],
  );

  const resetSection = useCallback(
    async (section: keyof SiteConfig) => {
      try {
        const defaults = await landingService.getDefaultSiteConfig();
        mutation.mutate({ [section]: defaults[section] });
      } catch (resetError) {
        toast.error(resetError instanceof Error ? resetError.message : "Could not load default content.");
      }
    },
    [mutation],
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
    isSaving: mutation.isPending,
  };
}
