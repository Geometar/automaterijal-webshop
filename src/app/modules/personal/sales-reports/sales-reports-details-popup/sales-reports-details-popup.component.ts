import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { AutomIconComponent } from '../../../../shared/components/autom-icon/autom-icon.component';
import { PopupComponent } from '../../../../shared/components/popup/popup.component';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { finalize, Subject, takeUntil } from 'rxjs';

// Component Imports
import { TextAreaComponent } from '../../../../shared/components/text-area/text-area.component';
import {
  InputFieldsComponent,
  TypeaheadItem,
} from '../../../../shared/components/input-fields/input-fields.component';

// Data Models
import { SelectModel } from '../../../../shared/data-models/interface';
import {
  Comment,
  Company,
  SalesReport,
  SalesReportCreate,
} from '../../../../shared/data-models/model';

// Enums
import {
  ButtonThemes,
  ColorEnum,
  IconsEnum,
  InputTypeEnum,
  PositionEnum,
  SizeEnum,
} from '../../../../shared/data-models/enums';

// Services
import { AccountStateService } from '../../../../shared/service/utils/account-state.service';
import { SalesReportsService } from '../../../../shared/service/sales-reports.service';
import { SnackbarService } from '../../../../shared/service/utils/snackbar.service';

export const SECTIONS: SelectModel[] = [
  { key: 'servis', value: 'Auto Servis' },
  { key: 'transport', value: 'Transport' },
  { key: 'industrija', value: 'Industrija' },
  { key: 'gradjevina', value: 'Gradjevina' },
  { key: 'obrada_metala', value: 'Obrada Metala' },
  { key: 'ostalo', value: 'Ostalo' },
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
    TextAreaComponent,
  ],
  templateUrl: './sales-reports-details-popup.component.html',
  styleUrl: './sales-reports-details-popup.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class SalesReportsDetailsPopupComponent implements OnInit, OnDestroy {
  @Input() salesReportId: number | null = null;
  @Output() closePopupModal = new EventEmitter<void>();

  // Data
  companies: Company[] = [];
  salesReportDetails: SalesReport | null = null;

  // Forms
  form: UntypedFormGroup;

  // Enums
  buttonThemes = ButtonThemes;
  colorEnum = ColorEnum;
  iconsEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  // Lables
  title = 'Kreiraj izvestaj';

  // Misc
  inputDisabled = false;
  internalLoading = false;
  isNewSalesReport = false;

  // Typeahead config
  companiesTypeAheadItems: TypeaheadItem[] = [];

  // Select config
  sectionSelectOptions = SECTIONS;
  selectedOption: SelectModel | null = null;

  private destroy$ = new Subject<void>();

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closePopupModal.emit();
    }
  }

  constructor(
    private accountStateService: AccountStateService,
    private fb: UntypedFormBuilder,
    private salesReportsService: SalesReportsService,
    private snackbarService: SnackbarService
  ) {
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
    this.accountStateService.get();
    this.initAllCompanies();
    if (this.salesReportId) {
      this.getSalesReport();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Angular lifecycle hooks end */

  /** Event start */

  initAllCompanies(): void {
    this.salesReportsService
      .fetchAllCompanies()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: Company[]) => {
          this.companies = response;
          this.companiesTypeAheadItems = response.map((value: Company) => {
            return { key: value.id, value: value.ime } as TypeaheadItem;
          });
        },
      });
  }

  getSalesReport(): void {
    this.internalLoading = true;
    this.isNewSalesReport = false;
    this.salesReportsService
      .getSalesReportDetails(this.salesReportId!)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.internalLoading = false;
        })
      )
      .subscribe({
        next: (salesReportDetails: SalesReport) => {
          this.salesReportDetails = salesReportDetails;
          const { komentarDto, firmaDto } = salesReportDetails;
          this.inputDisabled =
            komentarDto.ppid !== this.accountStateService.get().ppid;
          this.populateFormFromCompany(firmaDto);
          this.populateFormFromComment(komentarDto);
        },
      });
  }

  updateSalesReport(): void {
    this.internalLoading = true;
    this.salesReportsService
      .updateSalesReportDetails(this.salesReportId!, this.salesReportDetails!)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.internalLoading = false;
        })
      )
      .subscribe({
        next: (salesReportDetails: SalesReport) => {
          this.salesReportDetails = salesReportDetails;
          const { komentarDto, firmaDto } = salesReportDetails;
          this.populateFormFromCompany(firmaDto);
          this.populateFormFromComment(komentarDto);
          this.snackbarService.showAutoClose('Izveštaj uspešno izmenjen.');
        },
      });
  }

  createSalesReport(salesReportCreate: SalesReportCreate): void {
    this.salesReportsService
      .createSalesReport(salesReportCreate)
      .pipe(takeUntil(this.destroy$))
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
      const firma = this.companies.filter(
        (filterFirma: Company) => filterFirma.id === value.key
      )[0];
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

    this.selectedOption = this.sectionSelectOptions.filter(
      (data: SelectModel) => data.key === company.sektor
    )[0];
  }

  populateFormFromComment(comment: Comment): void {
    this.form.controls['comment'].patchValue(comment.komentar);
    this.form.controls['creationDate'].patchValue(comment.datumKreiranja);
    if (comment.podsetnik) {
      this.form.controls['reminder'].patchValue(comment.podsetnik);
    }
  }

  /** Btn event: start */

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isNewSalesReport) {
      this.createSalesReportEvent();
    } else {
      this.updateSalesReportEvent();
    }
  }

  private createSalesReportEvent(): void {
    const report = this.getSalesReportFromForm();
    this.createSalesReport(report);
  }

  private updateSalesReportEvent(): void {
    this.updateSalesReportDetailsFromForm();
    this.updateSalesReport();
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
      podsetnik: formValue.reminder
        ? new Date(formValue.reminder).getTime()
        : undefined,
      sektor: formValue.sector,
    };

    return salesReport;
  }
  /** Btn event: end */

  private updateSalesReportDetailsFromForm(): void {
    if (!this.salesReportDetails) return;

    const controls = this.form.controls;
    const company = this.salesReportDetails.firmaDto;
    const comment = this.salesReportDetails.komentarDto;

    // FirmaDto
    if (controls['address'].dirty) company.adresa = controls['address'].value;
    if (controls['assortment'].dirty)
      company.osnovniAsortiman = controls['assortment'].value;
    if (controls['city'].dirty) company.mesto = controls['city'].value;
    if (controls['competitors'].dirty)
      company.konkurent = controls['competitors'].value;
    if (controls['contact'].dirty) company.kontakt = controls['contact'].value;
    if (controls['name'].dirty) company.ime = controls['name'].value;
    if (controls['sector'].dirty) company.sektor = controls['sector'].value;

    // Obeleži da je firma menjana
    company.izmena = true;

    // KomentarDto
    if (controls['comment'].dirty) comment.komentar = controls['comment'].value;
    if (controls['creationDate'].dirty) {
      comment.datumKreiranja = new Date(controls['creationDate'].value);
    }
    if (controls['reminder'].dirty) {
      comment.podsetnik = controls['reminder'].value
        ? new Date(controls['reminder'].value)
        : undefined!;
    }
  }
}
