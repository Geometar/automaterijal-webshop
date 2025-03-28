import { Component } from '@angular/core';
import { Brand } from '../../../../shared/data-models/interface';
import { BrandSectionEnum } from '../../../../shared/data-models/enums';
import { ConfigService } from '../../../../shared/service/config.service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'onama-brendovi',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './brendovi.component.html',
  styleUrl: './brendovi.component.scss'
})
export class BrendoviComponent {

  // Raw brand data fetched from config
  brands: Brand[] = [];

  // Grouped brands by sector
  groupedBrands: Record<keyof typeof BrandSectionEnum, Brand[]> = {
    MOTOR_OIL: [],
    PARTS: [],
    FILTERS: [],
    BATTERIES: [],
    ACCESSORIES: []
  };

  // Enum reference for value lookups (e.g., display labels)
  brandSectionEnum = BrandSectionEnum;

  // Descriptions for each section — used in template
  sectionDescriptions: Record<keyof typeof BrandSectionEnum, string> = {
    MOTOR_OIL: 'Maziva koja pokreću vaše poslovanje – preko milion litara prodatih širom regiona.',
    FILTERS: 'Od traktora do bagera – filteri za dug vek trajanja.',
    BATTERIES: 'Pouzdani akumulatori za svako vozilo.',
    ACCESSORIES: 'Praktična dodatna oprema za enterijer i eksterijer vozila.',
    PARTS: 'Provereni delovi za sve vrste vozila, direktno od renomiranih proizvođača.'
  };

  // Extracts enum keys for iteration
  get sectionKeys(): (keyof typeof BrandSectionEnum)[] {
    return Object.keys(this.groupedBrands) as (keyof typeof BrandSectionEnum)[];
  }

  constructor(private configService: ConfigService) {
    this.configService.getConfig().subscribe(config => {
      this.brands = config.brands.filter(b => b.visible !== false);

      // Group brands by their section
      for (const brand of this.brands) {
        const section: keyof typeof BrandSectionEnum = brand.section || 'PARTS';

        if (!this.groupedBrands[section]) {
          this.groupedBrands[section] = [];
        }

        this.groupedBrands[section].push(brand);
      }
    });
  }

  // Returns the visible label for a given section
  getSectionLabel(sectionKey: keyof typeof BrandSectionEnum): string {
    return this.brandSectionEnum[sectionKey];
  }

  // Returns the description text for a section
  getSectionDescription(sectionKey: keyof typeof BrandSectionEnum): string {
    return this.sectionDescriptions[sectionKey] ?? '';
  }

  // Returns the list of brands for a section
  getBrandsForSection(sectionKey: keyof typeof BrandSectionEnum): Brand[] {
    return this.groupedBrands[sectionKey] ?? [];
  }
}