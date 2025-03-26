import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { AutomIconComponent } from '../../../../shared/components/autom-icon/autom-icon.component';
import { PopupComponent } from '../../../../shared/components/popup/popup.component';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

// Component Imports
import { TextAreaComponent } from '../../../../shared/components/text-area/text-area.component';
import { InputFieldsComponent, TypeaheadItem } from '../../../../shared/components/input-fields/input-fields.component';

// Data Models
import { SelectModel } from '../../../../shared/data-models/interface';
import { Company, SalesReportCreate } from '../../../../shared/data-models/model';

// Enums
import {
  ColorEnum,
  IconsEnum,
  InputTypeEnum,
  PositionEnum,
  SizeEnum,
} from '../../../../shared/data-models/enums';

// Services
import { SnackbarService } from '../../../../shared/service/utils/snackbar.service';
import { SalesReportsService } from '../../../../shared/service/sales-reports.service';


export const SECTIONS: SelectModel[] = [
  { key: 'servis', value: 'Auto Servis' },
  { key: 'transport', value: 'Transport' },
  { key: 'industrija', value: 'Industrija' },
  { key: 'gradjevina', value: 'Gradjevina' },
  { key: 'obrada_metala', value: 'Obrada Metala' },
  { key: 'ostalo', value: 'Ostalo' }
];

@Component({
  selector: 'sales-reports-details-popup',
  standalone: true,
  imports: [
    AutomIconComponent,
    ButtonComponent,
    FormsModule,
    InputFieldsComponent,
    PopupComponent,
    ReactiveFormsModule,
    SelectComponent,
    TextAreaComponent
  ],
  templateUrl: './sales-reports-details-popup.component.html',
  styleUrl: './sales-reports-details-popup.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class SalesReportsDetailsPopupComponent implements OnInit, OnDestroy {
  @Output() closePopupModal = new EventEmitter<void>();

  // Data
  companies: Company[] = [];

  // Forms
  form: UntypedFormGroup;

  // Enums
  colorEnum = ColorEnum;
  iconsEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  // Misc
  title = 'Kreiraj izvestaj';

  // Typeahead config
  companiesTypeAheadItems: TypeaheadItem[] = [];

  // Select config
  sectionSelectOptions = SECTIONS;


  private destroy$ = new Subject<void>();

  constructor(private fb: UntypedFormBuilder, private salesReportsService: SalesReportsService, private snackbarService: SnackbarService) {
    this.form = this.fb.group({
      address: ['', [Validators.required, Validators.minLength(3)]],
      assortment: ['', [Validators.required, Validators.minLength(3)]],
      city: ['', [Validators.required, Validators.minLength(3)]],
      comment: ['', [Validators.required, Validators.minLength(3)]],
      companyId: [''],
      competitors: ['', [Validators.required, Validators.minLength(3)]],
      contact: ['', [Validators.required, Validators.minLength(3)]],
      creationDate: [new Date(), [Validators.required]],
      name: ['', [Validators.required, Validators.minLength(3)]],
      reminder: [''],
      sector: ['', [Validators.required]],
    });
  }


  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    this.initAllCompanies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Angular lifecycle hooks end */

  /** Event start */

  initAllCompanies(): void {
    this.salesReportsService.fetchAllCompanies()
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response: Company[]) => {
          this.companies = response;
          this.companiesTypeAheadItems = response.map((value: Company) => {
            return { key: value.id, value: value.ime } as TypeaheadItem
          })
        },
      });
  }

  createSalesReport(salesReportCreate: SalesReportCreate): void {
    this.salesReportsService.createSalesReport(salesReportCreate)
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          this.snackbarService.showAutoClose('Izvestaj je uspesno kreiran');
        },
      });
  }

  /** Event end */


  setSelectionValue(controlName: any, value: any) {
    this.form.controls[controlName].setValue(value);
  }

  companyAutocompleteHandle(value: TypeaheadItem): void {
    if (value.key) {
      const firma = this.companies.filter((filterFirma: Company) => filterFirma.id === value.key)[0];
      this.populateFormFromCompany(firma);
    } else if (value.value) {
      this.setSelectionValue('name', value.value);
    }
  }

  populateFormFromCompany(company: Company): void {
    this.form.patchValue({
      address: company.adresa,
      assortment: company.osnovniAsortiman,
      city: company.mesto,
      companyId: company.id,
      competitors: company.konkurent,
      contact: company.kontakt,
      name: company.ime,
      sector: company.sektor,
    });
  }

  /** Btn event: start */

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const report = this.getSalesReportFromForm();
    this.createSalesReport(report);
  }


  private getSalesReportFromForm(): SalesReportCreate {
    const formValue = this.form.value;

    const salesReport: SalesReportCreate = {
      adresa: formValue.address,
      datumKreiranja: new Date(formValue.creationDate).getTime(),
      firmaId: formValue.companyId || undefined,
      ime: formValue.name,
      komentar: formValue.comment,
      konkurent: formValue.competitors,
      kontakt: formValue.contact,
      mesto: formValue.city,
      osnovniAsortiman: formValue.assortment,
      podsetnik: formValue.reminder ? new Date(formValue.reminder).getTime() : undefined,
      sektor: formValue.sector
    };

    return salesReport;
  }
  /** Btn event: end */
}