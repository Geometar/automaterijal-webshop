import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';

// Component imported
import { CheckboxComponent } from '../../../shared/components/checkbox/checkbox.component';
import { CheckboxGroupComponent, Task } from '../../../shared/components/checkbox-group/checkbox-group.component';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { RadioButtonComponent } from '../../../shared/components/radio-button/radio-button.component';

// Data models
import {
  CheckboxModel,
  RadioOption,
} from '../../../shared/data-models/interface';
import { Filter } from '../../../shared/data-models/model/roba';
import { Manufacture } from '../../../shared/data-models/model/proizvodjac';

// Enums
import {
  IconsEnum,
  InputTypeEnum,
  OrientationEnum,
  SizeEnum,
} from '../../../shared/data-models/enums';

// Service
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';

export enum FilterEnum {
  CATEGORY,
  MANUFACTURE,
}

@Component({
  selector: 'webshop-category',
  standalone: true,
  imports: [
    CheckboxComponent,
    CheckboxGroupComponent,
    CommonModule,
    InputFieldsComponent,
    RadioButtonComponent,
  ],
  templateUrl: './webshop-category.component.html',
  styleUrl: './webshop-category.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class WebshopCategoryComponent implements OnChanges, OnInit {
  @Input() categories: any = null;
  @Input() filter: Filter = new Filter();
  @Input() manufactures: Manufacture[] | undefined = [];

  // Misc
  openCategoriesFilters = true;
  openManufacturesFilters = true;

  // CheckBox Models
  categoriesCheckBoxModels: Task[] = [];
  manufacturesCheckBoxModels: CheckboxModel[] = [];

  // Radio Models
  radioOptions: RadioOption[] = [];
  radioOptionKeys = ['Svi artikli', 'Ima na stanju'];

  // Pre Filters
  manufacturerPreFilter = '';

  // Enums
  filterEnum = FilterEnum;
  iconEnums = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  orientation = OrientationEnum;
  sizeEnum = SizeEnum;

  get filteredManufactures(): CheckboxModel[] {
    this.manufacturesCheckBoxModels.filter((data: CheckboxModel) => {
      return data.value
        .toLowerCase()
        .includes(this.manufacturerPreFilter.toLowerCase());
    });
    return this.manufacturesCheckBoxModels.filter((data: CheckboxModel) =>
      data.value
        .toLowerCase()
        .includes(this.manufacturerPreFilter.toLowerCase())
    );
  }

  constructor(private urlHelperService: UrlHelperService) { }

  // Start of: Angular life cycles

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categories']) {
      this.fillCategories();
    }
    if (changes['manufactures']) {
      this.fillManufactures();
    }
    if (changes['filter'] && changes['filter'].firstChange) {
      this.adjustCompleteFilters();
    }
  }

  ngOnInit(): void {
    this.fillAvailability();
  }

  // End of: Angular life cycles

  fillAvailability(): void {
    const selected = this.filter.naStanju ? 'Ima na stanju' : 'Svi artikli';
    this.radioOptionKeys.forEach((value: string) => {
      this.radioOptions.push({
        key: value,
        value: value,
        checked: value === selected,
      } as RadioOption);
    });
  }

  fillCategories(): void {
    this.categoriesCheckBoxModels = [];
    if (this.categories != null) {
      const filteredSubGroups = this.filter.podgrupe ?? [];
      this.categoriesCheckBoxModels = Object.keys(this.categories).map((key) => {
        return {
          name: key,
          completed: false,
          id: key,
          subtasks: this.categories[key].map((item: any) => ({
            name: item.naziv,
            completed: filteredSubGroups.length ? filteredSubGroups.includes(item.id.toString()) : false,
            id: item.id,
            grupa: item.grupa
          }))
        };
      });
    }
  }

  fillManufactures(): void {
    this.manufacturesCheckBoxModels = [];
    if (this.manufactures?.length) {
      const filterManufactures = this.filter.proizvodjaci ?? [];
      this.manufactures.forEach((manufacture: Manufacture) => {
        this.manufacturesCheckBoxModels.push({
          value: manufacture.naziv,
          key: manufacture.proid,
          checked: filterManufactures.includes(manufacture.proid!),
        } as CheckboxModel);
      });
    }
  }

  // Start of: Emit handle

  adjustCategoriesFilters(): void {
    const categories: Task[] = this.categoriesCheckBoxModels && this.categoriesCheckBoxModels.length ? this.categoriesCheckBoxModels.flatMap((data: Task) => data.subtasks!) : [];
    this.urlHelperService.addOrUpdateQueryParams({
      podgrupe: categories.filter((category: Task) => category.completed).map((task: Task) => task.id)
    });
  }

  adjustManufactureFilters(): void {
    this.urlHelperService.addOrUpdateQueryParams({
      proizvodjaci: this.manufacturesCheckBoxModels
        .filter((value: CheckboxModel) => value.checked)
        .map((value: CheckboxModel) => value.key),
    });
  }

  adjustCompleteFilters(): void {
    if (this.manufactures?.length) {
      if (this.filter.proizvodjaci?.length) {
        this.manufacturesCheckBoxModels.forEach(
          (value: CheckboxModel) =>
            (value.checked = this.filter.proizvodjaci!.includes(value.key!))
        );
      }
    }
    if (this.categories !== null) {
      if (this.filter.podgrupe?.length) {
        this.categoriesCheckBoxModels.forEach(
          (value: Task) => {
            value.completed = this.filter.podgrupe!.includes(value.id.toString());
            value.subtasks?.forEach((subtaskValue: Task) => {
              subtaskValue.completed = this.filter.podgrupe!.includes(subtaskValue.id.toString());
            })

          }
        );
      }
    }
  }

  adjustAvailability(): void {
    const selectedCheckbox = this.radioOptions.find(
      (value: RadioOption) => value.checked
    );
    const allAvailability = selectedCheckbox?.key === this.radioOptionKeys[0];
    this.urlHelperService.addOrUpdateQueryParams({
      naStanju: !allAvailability,
    });
  }
  // End of: Emit handle

  // Start of: Filter categories

  preFilterManufactures(filterTerm: string): void {
    this.manufacturerPreFilter = filterTerm;
  }

  // End of: Filter categories
}
