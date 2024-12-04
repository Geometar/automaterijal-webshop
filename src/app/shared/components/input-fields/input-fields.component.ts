import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';

// Angular Material Modules
import {
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

export const MAX_VALUE = 999999999;

@Component({
  selector: 'autom-input-fields',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,

    // Angular Material
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,

    // Storybook modules
    ButtonComponent,
    AutomIconComponent,
    AutomLabelComponent,
    AutomTooltipDirective],
  templateUrl: './input-fields.component.html',
  styleUrl: './input-fields.component.scss'
})
export class InputFieldsComponent implements AfterViewInit, OnChanges, OnInit {
  @Input() anchor = false;
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
  @Input() maxDate = '';
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
  @Input() minDate = '';
  @Input() minutesGap: number | null = null;
  @Input() pattern = '';
  @Input() placeholder = '';
  @Input() prefix = '';
  @Input() preIcon = '';
  @Input() readonly = false;
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
        message = 'Maksimalan broj je ' + this.validatorMaxLength;
        break;

      case ctrl.hasError('minlength'):
        message = 'Minimalan broj je ' + this.validatorMaxLength;
        break;

      case ctrl.hasError('max'):
        message = 'Maksimalan broj je ' + this.validatorMaxValue;
        break;

      case ctrl.hasError('min'):
        message = 'Minimalan broj je ' + this.validatorMinValue;
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

    this.validators.forEach((validator: any) => {
      if (validator.name === 'required') {
        this.form!.controls['formCtrl'].addValidators(Validators.required);
      }

      if (validator.name === 'max') {
        this.form!.controls['formCtrl'].addValidators(Validators.max(validator.value));
        this.validatorMaxValue = validator.value;
      }

      if (validator.name === 'min') {
        this.form!.controls['formCtrl'].addValidators(Validators.min(validator.value));
        this.validatorMinValue = validator.value;
      }

      if (validator.name === 'maxLength') {
        this.form!.controls['formCtrl'].addValidators(Validators.maxLength(validator.value));
        this.validatorMaxLength = validator.value;
      }

      if (validator.name === 'minLength') {
        this.form!.controls['formCtrl'].addValidators(Validators.minLength(validator.value));
        this.validatorMinLength = validator.value;
      }

      if (validator.name === 'pattern') {
        this.form!.controls['formCtrl'].addValidators(Validators.pattern(validator.value));
      }
    });

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



  emitSelectedValue(): void {
    this.emitSelected.emit(this.form?.controls['formCtrl']?.value);
  }

  numberHandler(focusOut?: boolean): void {
    this.getInputErrorState();

    if (focusOut) {
      let value = this.form?.controls['formCtrl']?.value;

      if (this.roundOff) value = Math.round(+value).toString();

      this.emitSelected.emit(value);
      this.form!.controls['formCtrl'].setValue(value);
      this.form!.controls['formCtrl'].updateValueAndValidity();
    }
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
    // Do not trigger emitter if there is no action
    if (event) {
      this.customActionEvent.emit({
        event,
        value: this.form!.controls['formCtrl'].value
      });
    }
  }
}
