import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewEncapsulation } from '@angular/core';

// Component imported
import { CheckboxComponent } from '../../../shared/components/checkbox/checkbox.component';
import { RadioButtonComponent } from '../../../shared/components/radio-button/radio-button.component';

// Data models
import { CheckboxModel, RadioOption } from '../../../shared/data-models/interface';
import { Manufacture } from '../../../shared/data-models/model/proizvodjac';

// Enums
import { OrientationEnum, SizeEnum } from '../../../shared/data-models/enums';

export enum FilterEnum {
  CATEGORY, MANUFACTURE
}

@Component({
  selector: 'webshop-category',
  standalone: true,
  imports: [CommonModule, CheckboxComponent, RadioButtonComponent],
  templateUrl: './webshop-category.component.html',
  styleUrl: './webshop-category.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class WebshopCategoryComponent implements OnChanges, OnInit {
  @Input() categories: string[] | undefined = [];
  @Input() manufactures: Manufacture[] | undefined = [];

  // Misc
  openCategoriesFilters = true;
  openManufacturesFilters = true;

  // CheckBox Models
  categoriesCheckBoxModels: CheckboxModel[] = [];
  manufacturesCheckBoxModels: CheckboxModel[] = [];

  // Radio Models
  radioOptions: RadioOption[] = [];

  // Enums
  filterEnum = FilterEnum;
  orientation = OrientationEnum;
  sizeEnum = SizeEnum;

  // Start of: Angular life cycles

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categories']) {
      this.fillCategories();
    }
    if (changes['manufactures']) {
      this.fillManufactures();
    }
  }

  ngOnInit(): void {
    this.fillAvailability();
  }

  // End of: Angular life cycles

  fillAvailability(): void {
    ['Svi artikli', 'Ima na stanju'].forEach((value: string) => {
      this.radioOptions.push({ key: value, value: value } as RadioOption)
    })
  }

  fillCategories(): void {
    if (this.categories?.length) {
      this.categories.forEach((categorie: string) => {
        this.categoriesCheckBoxModels.push({ value: categorie, key: categorie, checked: false } as CheckboxModel)
      })
    } else {
      this.categoriesCheckBoxModels = [];
    }
  }

  fillManufactures(): void {
    if (this.manufactures?.length) {
      this.manufactures.forEach((manufacture: Manufacture) => {
        this.manufacturesCheckBoxModels.push({ value: manufacture.naziv, key: manufacture.proid, checked: false } as CheckboxModel)
      })
    } else {
      this.manufacturesCheckBoxModels = [];
    }
  }

  toggleSection(id: FilterEnum): void {
    switch (id) {
      case this.filterEnum.CATEGORY: {
        this.openCategoriesFilters = !this.openCategoriesFilters;
        break;
      }
      case this.filterEnum.MANUFACTURE: {
        this.openManufacturesFilters = !this.openManufacturesFilters;
        break;
      }
    }
  }
}
