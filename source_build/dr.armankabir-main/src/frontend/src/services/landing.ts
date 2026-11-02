/**
 * Landing Page Service
 *
 * Operations for the public-facing landing page content.
 * All data is persisted in MySQL via the PHP API.
 */

import { get, post } from '../lib/apiClient';

export interface SocialLink {
  label: string;
  url: string;
  icon: string;
}

export interface EmergencyContact {
  doctorName: string;
  whatsappNumber: string;
  prefilledMessage: string;
}

export interface Testimonial {
  id: string;
  patientName: string;
  quote: string;
  rating: number;
  date?: string;
}

export interface TestimonialsSection {
  heading: string;
  testimonials: Testimonial[];
}

export interface GalleryPhoto {
  id: string;
  dataUrl: string;
  caption: string;
}

export interface GallerySection {
  heading: string;
  photos: GalleryPhoto[];
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface FAQsSection {
  heading: string;
  faqs: FAQItem[];
}

export interface HeroSection {
  taglineEn: string;
  taglineBn: string;
  subheadingEn: string;
  subheadingBn: string;
  heroTaglineEn?: string;
  heroTaglineBn?: string;
  heroDescriptionEn?: string;
  heroDescriptionBn?: string;
  cta1Label: string;
  cta2Label: string;
}

export interface AboutSection {
  visible: boolean;
  clinicNameEn: string;
  clinicNameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  yearsExperience: number;
  patientCount: string;
  doctorCount: number;
  specialties: string[];
  affiliations: string[];
}

export interface FooterSection {
  addressEn: string;
  addressBn: string;
  phone: string;
  email: string;
  openingHours: string;
  copyrightText: string;
  socialLinks: SocialLink[];
}

export interface SiteConfig {
  heroSection: HeroSection;
  aboutSection: AboutSection;
  footerSection: FooterSection;
  emergencyContacts: EmergencyContact[];
  testimonialsSection: TestimonialsSection;
  gallerySection: GallerySection;
  faqsSection: FAQsSection;
  doctorContentOverrides: Record<string, Record<string, unknown>>;
  [section: string]: unknown;
}

interface FrontPageResponse {
  siteConfig?: Partial<SiteConfig>;
  doctorContentOverrides?: Record<string, Record<string, unknown>>;
}

export const landingService = {
  /** Load front page content from server */
  async loadContent(): Promise<Record<string, unknown> | null> {
    return get<Record<string, unknown>>('/frontpage/get.php');
  },

  /** Save front page content to server */
  async saveContent(data: Record<string, unknown>): Promise<boolean> {
    await post('/frontpage/save.php', data);
    return true;
  },

  /** Migrate legacy website preferences after an administrator signs in */
  async migrateLegacyContent(): Promise<void> {
    await post('/frontpage/migrate.php', {});
  },

  /** Get site configuration from frontpage content */
  async getSiteConfig(): Promise<SiteConfig | null> {
    const result = await get<FrontPageResponse>('/frontpage/get.php');
    if (!result?.siteConfig && !result?.doctorContentOverrides) return null;
    return {
      ...(result.siteConfig ?? {}),
      doctorContentOverrides:
        result.doctorContentOverrides ??
        result.siteConfig?.doctorContentOverrides ??
        {},
    } as SiteConfig;
  },

  /** Update site configuration via frontpage save */
  async updateSiteConfig(config: Partial<SiteConfig>): Promise<void> {
    const { doctorContentOverrides, ...siteConfig } = config;
    await post('/frontpage/save.php', {
      siteConfig,
      ...(doctorContentOverrides !== undefined ? { doctorContentOverrides } : {}),
    });
  },
};
