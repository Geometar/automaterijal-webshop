import { BrandSectionEnum } from "../enums";

export interface Brand {
  alt: string;
  id: string;
  label: string;
  section?: keyof typeof BrandSectionEnum;
  slug?: string;
  src: string;
  visible: boolean;
}

export interface Category {
  id: string;
  label: string;
  alt: string;
  src: string;
  visible: boolean;
}

export interface YoutubeLink {
  videoId: string;
  title: string;
  publishedAt: string;
  visible: boolean;
}

export interface WebshopConfig {
  brands: Brand[];
  categories: Category[];
  youtubeLinks: YoutubeLink[];
}