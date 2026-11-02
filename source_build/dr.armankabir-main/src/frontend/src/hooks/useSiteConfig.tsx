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

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  heroSection: {
    taglineEn: "Dr. Arman Kabir's Care",
    taglineBn: "ডা. আরমান কবিরের চেম্বার",
    subheadingEn: "Advanced Healthcare With a Human Touch",
    subheadingBn: "মানবিক স্পর্শে উন্নত স্বাস্থ্যসেবা",
    heroTaglineEn: "Healing with Trust and Compassion",
    heroTaglineBn: "বিশ্বাস ও সহানুভূতির সাথে নিরাময়",
    heroDescriptionEn:
      "Expert diagnosis, compassionate treatment, and trusted care for every stage of life.",
    heroDescriptionBn:
      "জীবনের প্রতিটি পর্যায়ে বিশেষজ্ঞ রোগ নির্ণয়, সহানুভূতিশীল চিকিৎসা ও বিশ্বস্ত সেবা।",
    cta1Label: "Book Appointment",
    cta2Label: "Emergency",
  },
  aboutSection: {
    visible: true,
    clinicNameEn: "Dr. Arman Kabir's Care",
    clinicNameBn: "ডা. আরমান কবিরের চেম্বার",
    descriptionEn:
      "Comprehensive patient management and medical education serving patients and students across Bangladesh.",
    descriptionBn:
      "বাংলাদেশ জুড়ে রোগী ও শিক্ষার্থীদের জন্য পূর্ণাঙ্গ রোগী ব্যবস্থাপনা ও চিকিৎসা শিক্ষা।",
    yearsExperience: 10,
    patientCount: "500+",
    doctorCount: 2,
    specialties: [
      "Internal Medicine",
      "Respiratory Medicine",
      "Diabetes & Endocrinology",
      "General Practice",
    ],
    affiliations: [
      "BSMMU",
      "DMCH",
      "Dhaka Medical College",
      "National Institute of Diseases of Chest & Hospital",
    ],
  },
  footerSection: {
    addressEn: "Dhaka, Bangladesh",
    addressBn: "ঢাকা, বাংলাদেশ",
    phone: "+880-1751-959262",
    email: "dr.armankabir011@gmail.com",
    openingHours: "Sat–Thu: 9 AM – 8 PM",
    copyrightText: "Dr. Arman Kabir's Care. All rights reserved.",
    socialLinks: [],
  },
  emergencyContacts: [
    {
      doctorName: "Dr. Arman Kabir",
      whatsappNumber: "8801751959262",
      prefilledMessage: "Hello Dr. Arman, I need an emergency consultation.",
    },
    {
      doctorName: "Dr. Samia Shikder",
      whatsappNumber: "880195721221",
      prefilledMessage: "Hello Dr. Samia, I need an emergency consultation.",
    },
  ],
  testimonialsSection: {
    heading: "What Our Patients Say",
    testimonials: [
      {
        id: "t1",
        patientName: "Rahim Uddin",
        quote:
          "Dr. Arman Kabir's care is exceptional. He listened carefully and gave clear guidance. I feel much better now.",
        rating: 5,
        date: "2025-03-10",
      },
      {
        id: "t2",
        patientName: "Nasrin Begum",
        quote:
          "Dr. Samia is very kind and thorough. The clinic is clean and the staff is helpful. Highly recommend.",
        rating: 5,
        date: "2025-02-20",
      },
      {
        id: "t3",
        patientName: "Karim Hossain",
        quote:
          "Excellent service. The online booking is very easy and I got an appointment the same day.",
        rating: 4,
        date: "2025-01-15",
      },
    ],
  },
  gallerySection: {
    heading: "Our Clinic Gallery",
    photos: [],
  },
  faqsSection: {
    heading: "Frequently Asked Questions",
    faqs: [],
  },
  doctorContentOverrides: {},
};

function withSiteConfigDefaults(config: SiteConfig | null): SiteConfig {
  return {
    ...DEFAULT_SITE_CONFIG,
    ...config,
    heroSection: {
      ...DEFAULT_SITE_CONFIG.heroSection,
      ...(config?.heroSection ?? {}),
    },
    aboutSection: {
      ...DEFAULT_SITE_CONFIG.aboutSection,
      ...(config?.aboutSection ?? {}),
    },
    footerSection: {
      ...DEFAULT_SITE_CONFIG.footerSection,
      ...(config?.footerSection ?? {}),
    },
    emergencyContacts: Array.isArray(config?.emergencyContacts)
      ? config.emergencyContacts
      : DEFAULT_SITE_CONFIG.emergencyContacts,
    testimonialsSection: {
      ...DEFAULT_SITE_CONFIG.testimonialsSection,
      ...(config?.testimonialsSection ?? {}),
      testimonials: Array.isArray(config?.testimonialsSection?.testimonials)
        ? config.testimonialsSection.testimonials
        : DEFAULT_SITE_CONFIG.testimonialsSection.testimonials,
    },
    gallerySection: {
      ...DEFAULT_SITE_CONFIG.gallerySection,
      ...(config?.gallerySection ?? {}),
      photos: Array.isArray(config?.gallerySection?.photos)
        ? config.gallerySection.photos
        : DEFAULT_SITE_CONFIG.gallerySection.photos,
    },
    faqsSection: {
      ...DEFAULT_SITE_CONFIG.faqsSection,
      ...(config?.faqsSection ?? {}),
      faqs: Array.isArray(config?.faqsSection?.faqs)
        ? config.faqsSection.faqs
        : DEFAULT_SITE_CONFIG.faqsSection.faqs,
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
    (section: keyof SiteConfig) => {
      mutation.mutate({ [section]: DEFAULT_SITE_CONFIG[section] });
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
