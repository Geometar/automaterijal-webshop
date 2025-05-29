import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// Automaterijal imports
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputFieldsComponent } from '../../../../shared/components/input-fields/input-fields.component';
import { PopupComponent } from '../../../../shared/components/popup/popup.component';
import { SelectComponent } from '../../../../shared/components/select/select.component';

// Data Models
import { Roba } from '../../../../shared/data-models/model/roba';
import { SelectModel } from '../../../../shared/data-models/interface';

// Enums
import {
  ButtonThemes,
  ColorEnum,
  IconsEnum,
  PositionEnum,
  SizeEnum,
} from '../../../../shared/data-models/enums';

// Services
import { RobaService } from '../../../../shared/service/roba.service';
import { SnackbarService } from '../../../../shared/service/utils/snackbar.service';

@Component({
  selector: 'add-attributes',
  standalone: true,
  imports: [
    ButtonComponent,
    CommonModule,
    FormsModule,
    InputFieldsComponent,
    PopupComponent,
    ReactiveFormsModule,
    SelectComponent,
  ],
  templateUrl: './add-atributes.component.html',
  styleUrl: './add-atributes.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class AddAttributesComponent implements OnDestroy {
  @Input() data: Roba = new Roba();
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  // Enums
  buttonThemes = ButtonThemes;
  colorEnum = ColorEnum;
  iconsEnum = IconsEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  // Select options
  attrTypesSelectModels: SelectModel[] = [
    { key: 'manual-a', value: 'Manual' },
    { key: 'manual-y', value: 'youtube' },
  ];

  form: FormGroup;

  private destroy$ = new Subject<void>();

  @HostListener('document:keydown.escape', ['$event'])
  onEscape() {
    this.close.emit();
  }

  get attributes(): FormArray {
    return this.form.get('attributes') as FormArray;
  }

  constructor(
    private fb: FormBuilder,
    private robaService: RobaService,
    private snackbar: SnackbarService
  ) {
    this.form = this.fb.group({
      attributes: this.fb.array([this.createAttributeForm()]),
    });
  }

  /** Start of: Angular lifecycle hooks */

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** End of: Angular lifecycle hooks */


  /** Start of: API event */

  submit(): void {
    if (this.form.invalid) return;

    const payload = this.attributes.value.map((attr: any) => ({
      ...attr,
      katbr: this.data.katbr,
      ppid: this.data.proizvodjac?.proid,
      robaId: this.data.robaid,
    }));

    this.robaService
      .saveTecDocAttributes(this.data.robaid!, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackbar.showSuccess('Atributi uspešno sačuvani');
          this.saved.emit();
        },
        error: () => {
          console.error('Greška pri čuvanju atributa');
          this.close.emit();
        },
      });
  }


  /** End of: API event */

  createAttributeForm(): FormGroup {
    return this.fb.group({
      attrShortName: ['', Validators.required],
      attrValue: ['', Validators.required],
      attrUnit: [''],
      attrType: ['A', Validators.required],
      dokumentId: [''],
      dokument: [null],
    });
  }

  addAttribute(): void {
    this.attributes.push(this.createAttributeForm());
  }

  setAttributeFormValues(index: number, control: string, value: string): void {
    this.attributes.at(index)?.get(control)?.setValue(value);
  }

  removeAttribute(index: number): void {
    this.attributes.removeAt(index);
  }

  cancel(): void {
    this.close.emit();
  }
}
