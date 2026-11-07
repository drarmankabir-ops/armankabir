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
  doctorNameBn?: string;
  whatsappNumber: string;
  prefilledMessage: string;
  prefilledMessageBn?: string;
}

export interface Testimonial {
  id: string;
  patientName: string;
  patientNameBn?: string;
  quote: string;
  quoteBn?: string;
  rating: number;
  date?: string;
}

export interface TestimonialsSection {
  heading: string;
  headingBn?: string;
  testimonials: Testimonial[];
}

export interface GalleryPhoto {
  id: string;
  dataUrl: string;
  caption: string;
  captionBn?: string;
}

export interface GallerySection {
  heading: string;
  headingBn?: string;
  photos: GalleryPhoto[];
}

export interface FAQItem {
  id: string;
  question: string;
  questionBn?: string;
  answer: string;
  answerBn?: string;
}

export interface FAQsSection {
  heading: string;
  headingBn?: string;
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
  cta1LabelBn: string;
  cta2Label: string;
  cta2LabelBn: string;
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
  specialtiesBn?: string[];
  affiliations: string[];
  affiliationsBn?: string[];
}

export interface FooterSection {
  addressEn: string;
  addressBn: string;
  phone: string;
  email: string;
  openingHours: string;
  openingHoursBn?: string;
  copyrightText: string;
  copyrightTextBn?: string;
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

export interface SiteConfigPatch {
  heroSection?: Partial<HeroSection>;
  aboutSection?: Partial<AboutSection>;
  footerSection?: Partial<FooterSection>;
  emergencyContacts?: EmergencyContact[];
  testimonialsSection?: Partial<TestimonialsSection>;
  gallerySection?: Partial<GallerySection>;
  faqsSection?: Partial<FAQsSection>;
  doctorContentOverrides?: Record<string, Record<string, unknown>>;
  [section: string]: unknown;
}

interface FrontPageResponse {
  siteConfig?: Partial<SiteConfig>;
  doctorContentOverrides?: Record<string, Record<string, unknown>>;
}

let frontPageWriteQueue: Promise<void> = Promise.resolve();

function enqueueFrontPageWrite<T>(write: () => Promise<T>): Promise<T> {
  const queuedWrite = frontPageWriteQueue.then(write, write);
  frontPageWriteQueue = queuedWrite.then(() => undefined, () => undefined);
  return queuedWrite;
}

export const landingService = {
  /** Load front page content from server */
  async loadContent(): Promise<Record<string, unknown> | null> {
    return get<Record<string, unknown>>('/frontpage/get.php');
  },

  /** Save front page content to server */
  async saveContent(data: Record<string, unknown>): Promise<boolean> {
    await enqueueFrontPageWrite(() => post('/frontpage/save.php', data));
    return true;
  },

  /** Migrate legacy website preferences after an administrator signs in */
  async migrateLegacyContent(): Promise<void> {
    await enqueueFrontPageWrite(() => post('/frontpage/migrate.php', {}));
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

  /** Fetch PHP-owned initial values for the admin section reset action. */
  async getDefaultSiteConfig(): Promise<SiteConfig> {
    return get<SiteConfig>('/frontpage/get.php', { key: 'defaults' });
  },

  /** Update site configuration via frontpage save */
  async updateSiteConfig(config: SiteConfigPatch): Promise<void> {
    const { doctorContentOverrides, ...siteConfig } = config;
    await enqueueFrontPageWrite(() =>
      post('/frontpage/save.php', {
        siteConfig,
        ...(doctorContentOverrides !== undefined ? { doctorContentOverrides } : {}),
      }),
    );
  },
};
