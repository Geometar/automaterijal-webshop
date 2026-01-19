import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormControl, UntypedFormGroup, ValidatorFn, Validators } from '@angular/forms';

// Angular Material Modules
import {
  MatDatepickerInputEvent,
  MatDatepickerModule
} from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { ButtonComponent } from '../button/button.component';
import { AutomIconComponent } from '../autom-icon/autom-icon.component';
import { AutomLabelComponent } from '../autom-label/autom-label.component';
import { AutomTooltipDirective } from '../autom-tooltip/autom-tooltip.directive';
import { IconModel } from '../../data-models/interface';
import { ButtonThemes, ButtonTypes, ColorEnum, IconsEnum, InputTypeEnum, SizeEnum, TooltipPositionEnum, TooltipThemeEnum, TooltipTypesEnum } from '../../data-models/enums';
import { debounceTime, distinctUntilChanged, map, Observable, of, startWith, Subject } from 'rxjs';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';


export const MAX_VALUE = 999999999;
export interface TypeaheadItem {
  img?: string;
  item?: any;
  key?: string | number;
  value?: string;
}

@Component({
  selector: 'autom-input-fields',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    // Angular Material
    MatAutocompleteModule,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,

    // Storybook modules
    ButtonComponent,
    AutomIconComponent,
    AutomLabelComponent,
    AutomTooltipDirective],
  templateUrl: './input-fields.component.html',
  styleUrl: './input-fields.component.scss',
})
export class InputFieldsComponent implements AfterViewInit, OnChanges, OnInit {
  @Input() allowFreeTextInput: boolean = false;
  @Input() anchor = false;
  @Input() autocompleteOptions: TypeaheadItem[] = []
  @Input() autocompleteSelected: TypeaheadItem | null = null;
  @Input() autofocus = false;
  @Input() clearBtn = true;
  @Input() currency = '';
  @Input() custom = '';
  @Input() customAction: any;
  @Input() customClass = '';
  @Input() disableInput = false;
  @Input() end?: string | Date;
  @Input() error = '';
  @Input() errorAnimationTrigger = false;
  @Input() flag = '';
  @Input() hint = '';
  @Input() id = '';
  @Input() inputInsideTable = false;
  @Input() internalError = '';
  @Input() invalid = false;
  @Input() label = '';
  @Input() labelIcons: Array<IconModel> = [];
  @Input() labelSize = SizeEnum.FULL;
  @Input() max = MAX_VALUE;
  @Input() maxDate: Date | null = null;
  @Input() maxLength = 256;
  /**
   * minutesGap notes:
   * 1. consumed by this component's timepicker mode,
   * which uses 3rd party library ngxTimepicker.
   *
   * 2. setting this to a more normal value like 1 will
   * visually flood the popup version of the timepicker.
   * Leaving it to null as a workaround, to actually let
   * it default to increments of 5 minutes (only visually)
   * in the popup mode, while still allowing a user to navigate
   * it by increments of 1, in both manual and popup modes.
   */
  @Input() min = 0;
  @Input() minDate: Date | null = null;
  @Input() minutesGap: number | null = null;
  @Input() pattern = '';
  @Input() placeholder = '';
  @Input() prefix = '';
  @Input() preIcon = '';
  @Input() readonly = false;
  @Input() round = false;
  @Input() required = false;
  @Input() resetField = false;
  @Input() roundOff = false;
  @Input() selector = '';
  @Input() size = SizeEnum.LARGE;
  @Input() start: string | Date | null = null;
  @Input() step = 0.01;
  @Input() suffixIcon = '';
  @Input() suffixIconAction = '';
  @Input() type: InputTypeEnum = InputTypeEnum.TEXT;
  @Input() validators: Array<any> = [];
  @Input() validatorPatternMessage = 'ERROR_SPECIAL_CHARACTERS_ARE_NOT_ALLOWED';
  @Input() value = '' as any;
  @Input() warning = '';
  @Output() customActionEvent = new EventEmitter<any>();
  @Output() emitSelected = new EventEmitter<any | null>();
  @ViewChild('automInput') automInput: ElementRef | null = null;

  // Autocomplete config
  filteredAutocompleteOptions: Observable<TypeaheadItem[]> = of([]);
  @ViewChild(MatAutocompleteTrigger) autocompleteTrigger?: MatAutocompleteTrigger;


  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  inputTypes = InputTypeEnum;
  sizeEnum = SizeEnum;
  tooltipPositionEnum = TooltipPositionEnum;
  tooltipThemeEnum = TooltipThemeEnum;
  tooltipTypesEnum = TooltipTypesEnum;

  cdr: ChangeDetectorRef;
  form?: UntypedFormGroup;

  validatorMaxLength?: number;
  validatorMaxValue?: number;
  validatorMinLength?: number;
  validatorMinValue?: number;
  viewPassword = false;

  // Misc
  currencyCode = '';
  inputHasError = false;
  inputHaveClearButton = false;

  maxAllowedDate = '2999-12-31';
  minAllowedDate = '1899-12-31';

  // Translation Keys
  dateError = 'ERROR_INVALID_DATE';
  dateRangeError = 'ERROR_INVALID_DATE_RANGE';
  fieldRequiredError = 'REQUIRED';
  maxError = 'ERROR_MAX_VALUE_OF';
  maxLengthError = 'ERROR_MAX_LENGTH_OF';
  minError = 'ERROR_MIN_VALUE_OF';
  minLengthError = 'ERROR_MIN_LENGTH_OF';
  numberError = 'ERROR_ENTER_VALID_NUMBER';

  searchTerm$ = new Subject<string>();

  get inputHasErrorGetter(): boolean {
    const formCtrl = this.form?.controls?.['formCtrl'];
    if (!formCtrl) return false;

    const emptyAndRequired = !formCtrl.value && this.required;
    const formInvalid = formCtrl.invalid;
    const formMarkedAsInvalidByParentComponent = this.invalid;
    const touched = formCtrl.touched || formCtrl.dirty;

    return touched && (emptyAndRequired || formInvalid || formMarkedAsInvalidByParentComponent);
  }

  get errorMessage(): string {
    let message = '';
    const ctrl = this.form?.controls?.['formCtrl'];

    if (!ctrl) {
      return '';
    }

    switch (true) {
      case this.invalid && !!this.error:
        message = this.error;
        break;

      case ctrl.hasError('required'):
        message = 'Polje obavezno!'
        break;

      case ctrl.hasError('isNan'):
        message = 'Polje nije broj!'
        break;

      case ctrl.hasError('maxlength'):
        message = 'Min: ' + this.validatorMaxLength;
        break;

      case ctrl.hasError('minlength'):
        message = 'Minimalan broj je ' + this.validatorMaxLength;
        break;

      case ctrl.hasError('invalidDate'):
        message = 'Datum nije ispravan';
        break;

      case ctrl.hasError('invalidDateRange'):
        message = 'Datum nije ispravan';
        break;

      case ctrl.hasError('max'):
        message = 'Max: ' + this.validatorMaxValue;
        break;

      case ctrl.hasError('min'):
        message = 'Mix: ' + this.validatorMinValue;
        break;

      case ctrl.hasError('pattern'):
        message = InputTypeEnum.EMAIL === this.type ? 'Email nije dobar' : 'Nije ispostovan patern!'
        break;

      case ctrl.hasError('email'):
        message = 'Email nije dobar!'
        break;
    }

    return message;
  }

  constructor(
    private _cdr: ChangeDetectorRef,
  ) {
    this.cdr = _cdr;
  }

  /**
   * NG lifecycle hooks
   */
  ngAfterViewInit(): void {
    this.setAutoFocus();
    this.cdr.detectChanges();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.form) return;

    if (changes['currency']) {
      this.initCurrency(changes['currency'].currentValue as string);
    }

    if (changes['disableInput']) {
      this.setDisabledState();
    }

    if (!changes['errorAnimationTrigger'] && this.resetField) {
      this.resetForm();
    }

    if (changes['required']) {
      changes['required'].currentValue
        ? this.form!.controls['formCtrl'].addValidators(Validators.required)
        : this.form!.controls['formCtrl'].removeValidators(Validators.required);
    }

    if (changes['value']) {
      this.setFormControlValues();
    }

    if (changes['validators']) {
      this.setCtrlValidators();
    }

    if (this.type === this.inputTypes.AUTOCOMPLETE && changes['autocompleteSelected']) {
      const selected = changes['autocompleteSelected'].currentValue;
      const ctrl = this.form.get('formCtrl');


      if (selected?.value) {
        ctrl?.setValue(selected.value, { emitEvent: false });
      } else {
        ctrl?.setValue('', { emitEvent: false });
      }
    }
  }

  ngOnInit(): void {
    this.createForm();
    this.setFormControlValues();
    this.setCtrlValidators();
    this.initClearButtonState();
    this.initMinMaxValues();

    if (this.currency) {
      this.initCurrency(this.currency);
    }


    if (this.type === this.inputTypes.AUTOCOMPLETE) {
      this.filteredAutocompleteOptions = this.form!.get('formCtrl')!.valueChanges.pipe(
        startWith(''),
        map(value => this._filterAutocomplete(value || '').slice(0, 50))
      );

      if (this.autocompleteSelected?.value) {
        this.form?.get('formCtrl')?.setValue(this.autocompleteSelected.value);
      }
    }

    if (this.type === this.inputTypes.SEARCH) {
      this.searchTerm$
        .pipe(
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe(value => {
          this.emitSelected.emit(value);
        });
    }
  }

  /**
   * Form init
   */
  createForm(): void {
    switch (this.type) {
      case this.inputTypes.DATE_RANGE:
        this.form = new UntypedFormGroup({
          start: new UntypedFormControl(),
          end: new UntypedFormControl()
        });
        break;
      case this.inputTypes.EMAIL:
        this.form = new UntypedFormGroup({
          formCtrl: new UntypedFormControl({
            value: this.value,
            disabled: this.disableInput
          }, Validators.email)
        });
        break;
      default:
        this.form = new UntypedFormGroup({
          formCtrl: new UntypedFormControl({
            value: this.value,
            disabled: this.disableInput
          })
        });
        break;
    }
  }

  setAutoFocus(): void {
    if (this.autofocus) {
      setTimeout(() => {
        this.automInput!.nativeElement.focus();
        this.form!.markAsTouched();
      });
    }
  }

  setFormControlValues(): void {
    if (!this.form) return;

    switch (this.type) {
      default:
        if (this.value) {
          this.form!.controls['formCtrl'].setValue(this.value);
          this.emitSelected.emit(this.value);
        }
        break;
    }
  }

  setCtrlValidators(): void {
    if (!this.form || [this.inputTypes.DATE_RANGE].includes(this.type)) return;

    if (!this.validators.length) {
      return;
    }

    const validatorFns: ValidatorFn[] = this.validators
      .map((validator: any): ValidatorFn | null => {
        if (validator.required) {
          return Validators.required;
        }

        switch (validator.name) {
          case 'required':
            return Validators.required;

          case 'max':
            this.validatorMaxValue = validator.value;
            return Validators.max(validator.value);

          case 'min':
            this.validatorMinValue = validator.value;
            return Validators.min(validator.value);

          case 'maxLength':
            this.validatorMaxLength = validator.value;
            return Validators.maxLength(validator.value);

          case 'minLength':
            this.validatorMinLength = validator.value;
            return Validators.minLength(validator.value);

          case 'pattern':
            return Validators.pattern(validator.value);

          default:
            return null;
        }
      })
      .filter((v): v is ValidatorFn => v !== null); // Strictly filter out nulls

    this.form!.controls['formCtrl'].setValidators(validatorFns);
    this.form!.controls['formCtrl'].updateValueAndValidity();
  }

  setDisabledState(): void {
    this.disableInput ? this.form!.controls['formCtrl'].disable() : this.form!.controls['formCtrl'].enable();
    this.form!.controls['formCtrl'].updateValueAndValidity();
  }

  /**
   * Event Handlers
   */
  datePickerErrorHandler(error: string): void {
    this.form!.controls['formCtrl'].setErrors({ invalid: true });
    this.form!.controls['formCtrl'].setErrors({
      [error]: true
    });
  }

  onSearchInputChange(): void {
    const value = this.form?.controls['formCtrl']?.value;
    this.searchTerm$.next(value);
  }

  emitSelectedValue(): void {
    this.emitSelected.emit(this.form?.controls['formCtrl']?.value);
  }

  numberHandler(focusOut?: boolean): void {
    this.getInputErrorState();

    if (focusOut) {
      const rawValue = this.form?.controls['formCtrl']?.value;
      const isQuantity = this.type === InputTypeEnum.QUANTITY;

      if (isQuantity) {
        const normalized = this.normalizeQuantity(rawValue);
        this.value = normalized;
        this.emitSelected.emit(normalized);
        this.form!.controls['formCtrl'].setValue(normalized);
        this.form!.controls['formCtrl'].updateValueAndValidity();
        return;
      }

      let value = rawValue;
      if (this.roundOff) value = Math.round(+value).toString();
      const isNumber = this.type === InputTypeEnum.NUMBER;

      this.emitSelected.emit(isNumber ? +value : value);
      this.form!.controls['formCtrl'].setValue(value);
      this.form!.controls['formCtrl'].updateValueAndValidity();
    }
  }

  get quantityIncreaseDisabled(): boolean {
    if (this.type !== InputTypeEnum.QUANTITY) return true;
    const current = this.normalizeQuantity(this.form?.controls['formCtrl']?.value ?? this.value);
    const step = this.getQuantityStep();
    const max = this.getQuantityMax();
    return current + step > max;
  }

  get quantityDecreaseDisabled(): boolean {
    if (this.type !== InputTypeEnum.QUANTITY) return true;
    const current = this.normalizeQuantity(this.form?.controls['formCtrl']?.value ?? this.value);
    const step = this.getQuantityStep();
    const min = this.getQuantityMin();
    return current - step < min;
  }

  increaseQuantity(): void {
    if (this.type !== InputTypeEnum.QUANTITY) return;
    const step = this.getQuantityStep();
    const max = this.getQuantityMax();
    const current = this.normalizeQuantity(this.form?.controls['formCtrl']?.value ?? this.value);
    const next = Math.min(current + step, max);
    if (next === current) return;
    this.setQuantityValue(next);
  }

  decreaseQuantity(): void {
    if (this.type !== InputTypeEnum.QUANTITY) return;
    const step = this.getQuantityStep();
    const min = this.getQuantityMin();
    const current = this.normalizeQuantity(this.form?.controls['formCtrl']?.value ?? this.value);
    const next = Math.max(current - step, min);
    if (next === current) return;
    this.setQuantityValue(next);
  }

  private setQuantityValue(value: number): void {
    this.value = value;
    this.form?.controls['formCtrl'].setValue(value);
    this.emitSelected.emit(value);
  }

  private normalizeQuantity(raw: unknown): number {
    const step = this.getQuantityStep();
    const min = this.getQuantityMin();
    const max = this.getQuantityMax();

    let value = this.toNumber(raw);
    if (!Number.isFinite(value)) value = min;

    value = Math.floor(value);
    if (value < min) value = min;

    if (step > 1) {
      value = Math.ceil(value / step) * step;
    }

    if (value > max) value = max;

    if (value < min) value = min;
    return value;
  }

  private getQuantityStep(): number {
    const step = this.toNumber(this.step);
    if (!Number.isFinite(step) || step <= 0) return 1;
    return Math.max(1, Math.floor(step));
  }

  private getQuantityMin(): number {
    const min = this.toNumber(this.min);
    if (!Number.isFinite(min)) return 0;
    return Math.max(0, Math.floor(min));
  }

  private getQuantityMax(): number {
    const max = this.toNumber(this.max);
    const step = this.getQuantityStep();
    const fallback = MAX_VALUE;
    if (!Number.isFinite(max)) return fallback;
    const floored = Math.floor(max);
    if (step <= 1) return floored;
    return Math.floor(floored / step) * step;
  }

  private toNumber(raw: unknown): number {
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return NaN;
      const parsed = Number(trimmed.replace(',', '.'));
      return parsed;
    }
    return Number(raw);
  }

  resetForm(): void {
    this.end = '';
    this.start = '';
    this.value = '';

    setTimeout(() => {
      if (this.type === this.inputTypes.DATE_RANGE) {
        ['start', 'end'].forEach((control: string) => this.resetFormControls(control));
      } else {
        this.resetFormControls();
      }
    }, 50);

    this.emitSelected.emit('');
  }

  resetFormControls(control = ''): void {
    const controlName = control || 'formCtrl';
    const inputIsRequired = this.validators.find((item: any) => item.name === 'required' && item.value);

    if (!inputIsRequired?.value && !this.required) {
      // for non mandatory inputs, we mark the input as pristine, and clear any errors
      this.form?.controls[controlName].markAsPristine();
      this.form?.controls[controlName].markAsUntouched();
      this.form?.controls[controlName].setErrors(null);
      this.form?.reset();
      this.error = '';
    } else {
      // when the input is mandatory, we still need to consider it touched/dirty, even if cleared, for validations to remain.
      this.form?.controls[controlName].markAsDirty();
      this.form?.controls[controlName].markAsTouched();
    }

    this.form?.controls[controlName].updateValueAndValidity();
    this.form?.controls[controlName].setValue('');
  }

  datePickerHandler(event: MatDatepickerInputEvent<Date>): void {
    /**
     *
     * TODO: Replace this with date format validation
     * to prevent emitter and trigger error on the input field
     * till then leave date field readonly. The idea is to get
     * the actual value from the cesarxInput element and check
     * if it matches with the regex for the dates that we allow
     *
     *  */
    // const input = (this.cesarxInput as ElementRef).nativeElement.value;
    // if (!this.dateFormatValidation(input)) return;

    const emittedValue = event.value;

    // DATE: Do not clear date if 0 entered first time
    if (!emittedValue && this.customAction === 'clearDate') {
      this.customActionEvent.emit();
      return;
    } else if (!emittedValue) {
      this.datePickerErrorHandler('invalidDate');
      return;
    }

    // DATE: Do not emit invalid date or date out of range
    const date = new Date(emittedValue);
    const minDate = this.minDate || new Date(this.minAllowedDate);
    const maxDate = this.maxDate || new Date(this.maxDate || this.maxAllowedDate);

    if (date < minDate || date > maxDate) {
      this.datePickerErrorHandler('invalidDateRange');
      return;
    }
    // Don't emit Invalid date values
    if (isNaN(date.getDate()) || isNaN(date.getTime())) {
      this.datePickerErrorHandler('invalidDate');
      return;
    }

    this.form!.controls['formCtrl'].setValue(emittedValue);
    this.form!.controls['formCtrl'].updateValueAndValidity();
    this.emitSelected.emit(emittedValue);
  }

  datePickerValidator(event: KeyboardEvent): boolean {
    const digits = event.charCode >= 48 && event.charCode <= 57;
    const separator = event.charCode >= 45 && event.charCode <= 47;

    if (digits || separator) {
      return true;
    }

    event.preventDefault();
    return false;
  }

  /**
   * Utility methods
   */
  convertTimeToMilitaryFormat(time12h: string): string {
    const [time, modifier] = time12h.split(' ');
    const splitTimeString = time.split(':');

    let hours = splitTimeString[0];
    const minutes = splitTimeString[1];

    if (hours === '12') {
      hours = '00';
    }

    const parsedHours = parseInt(hours);
    if (modifier === 'PM') {
      hours = (parsedHours + 12).toString();
    } else if (parsedHours < 10 && parsedHours > 0) {
      hours = '0' + hours;
    }

    return `${hours}:${minutes}`;
  }

  getInputErrorState(): void {
    if (!this.form) {
      this.inputHasError = false;
    }

    switch (this.type) {
      case this.inputTypes.DATE_RANGE:
        this.inputHasError =
          (this.form!.controls['start'].invalid &&
            (this.form!.controls['start'].touched || this.form!.controls['start'].dirty)) ||
          (this.form!.controls['end'].invalid &&
            (this.form!.controls['end'].touched || this.form!.controls['end'].dirty)) ||
          this.invalid;
        break;
      default:
        this.inputHasError = this.inputHasErrorGetter;
    }
  }

  initClearButtonState(): void {
    this.inputHaveClearButton = !Array.from([
      this.inputTypes.CUSTOM,
      this.inputTypes.NUMBER,
      this.inputTypes.PASSWORD
    ]).includes(this.type);
  }

  initCurrency(currency: string): void {
    this.currencyCode = 'RSD';
  }

  initMinMaxValues(): void {
    if (this.type !== this.inputTypes.NUMBER) return;

    /**
     * if we have a defined max return it
     * else if we have restriction on length disable default max validation
     * else return the default max */
    const defaultMax = this.validators
      .map((val) => val.name)
      .filter((val) => val === 'maxLength')
      .pop()
      ? null
      : MAX_VALUE;
    this.max = this.max < MAX_VALUE ? this.max : defaultMax!;

    /**
     * if we have a defined min return it
     * else if we have restriction on length disable default min validation
     * else return the default min */
    const defaultMin = this.validators
      .map((val) => val.name)
      .filter((val) => val === 'minLength')
      .pop()
      ? null
      : 0;
    this.min = this.min ? this.min : defaultMin!;
  }

  suffixIconActionEvent(event: string): void {
    this.customActionEvent.emit({
      value: this.form!.controls['formCtrl'].value
    });

  }

  onEnter(): void {
    this.customActionEvent.emit({
      value: this.form!.controls['formCtrl'].value
    });
  }

  // Autocomplete logic: start of
  onAutocompleteBlur(): void {
    setTimeout(() => {
      const ctrl = this.form?.get('formCtrl');
      const inputValue = ctrl?.value?.trim();

      if (!inputValue) {
        // If the input is empty, do nothing
        return;
      }

      const isValid = this.autocompleteOptions.some(opt => opt.value === inputValue);

      if (isValid) {
        // If the typed value is a valid selection, leave it as is
        return;
      }

      if (this.allowFreeTextInput) {
        // Let user input stay — emit it as-is
        this.emitSelected.emit({ key: null, value: inputValue });
        return;
      }

      if (this.autocompleteSelected?.value) {
        // If a value was previously selected, revert back to it
        ctrl?.setValue(this.autocompleteSelected.value, { emitEvent: false });
      } else {
        // If nothing was selected, clear the input and emit null
        ctrl?.setValue('', { emitEvent: false });
        this.emitSelected.emit(null);
      }
    }, 150); // Delay to allow autocomplete selection to complete
  }

  onAutocompleteFocus(): void {
    const ctrl = this.form?.get('formCtrl');
    if (ctrl && !ctrl.value) {
      ctrl.setValue('');
    }
  }

  onAutocompleteSelected(event: MatAutocompleteSelectedEvent) {
    const selectedItem = this.autocompleteOptions.find(o => o.value === event.option.value);
    if (selectedItem) {
      this.form?.get('formCtrl')?.setValue(selectedItem.value);
      this.emitSelected.emit(selectedItem);
    }
  }

  private _filterAutocomplete(value: string): TypeaheadItem[] {
    const filterValue = value.toLowerCase();
    return this.autocompleteOptions.filter(option =>
      option.value?.toLowerCase().includes(filterValue)
    );
  }
  // Autocomplete logic: end
}
