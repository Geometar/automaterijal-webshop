export interface BrandPageSeoMetadata {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
}

export interface BrandPageCta {
  label: string;
  url?: string;
}

export interface BrandPageSectionHighlight {
  title: string;
  description?: string;
}

export interface BrandPageSection {
  title: string;
  body: string;
  highlights?: BrandPageSectionHighlight[];
  image?: string;
}

export interface BrandPageShowcaseConfig {
  title?: string;
  subtitle?: string;
  limit?: number;
}

export interface BrandPageHeroConfig {
  background?: string;
  textColor?: string;
  accentColor?: string;
  tagline?: string;
  image?: string;
  imageAlt?: string;
}

export interface BrandPageData {
  name: string;
  logo: string;
  description: string;
  hero?: BrandPageHeroConfig;
  sections: BrandPageSection[];
  seo: BrandPageSeoMetadata;
  cta?: BrandPageCta;
  showcase?: BrandPageShowcaseConfig;
  manufacturerId?: string;
}
