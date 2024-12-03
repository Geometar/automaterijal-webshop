import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

// Automaterijal Component
import { AutomLabelComponent } from '../autom-label/autom-label.component';
import { AutomIconComponent } from '../autom-icon/autom-icon.component';

// Angular Material Modules
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { FormsModule, ReactiveFormsModule, UntypedFormControl, Validators } from '@angular/forms';
import { ColorEnum, IconsEnum, OrientationEnum, SizeEnum, TooltipPositionEnum, TooltipThemeEnum, TooltipTypesEnum } from '../../data-models/enums';
import { IconModel, TooltipModel } from '../../data-models/interface';
import { SelectAlert, SelectModel } from '../../data-models/interface/selected-item.interface';
import { AutomTooltipDirective } from '../autom-tooltip/autom-tooltip.directive';

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AutomIconComponent,
    MatSelectModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    AutomLabelComponent, AutomTooltipDirective],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss'
})
export class SelectComponent implements OnChanges {
  @Input() alert: SelectAlert | null = null;
  @Input() customClass = '';
  @Input() disableSelect = false;
  @Input() error = '';
  @Input() invalid = false;
  @Input() label = '';
  @Input() labelIcons: Array<IconModel> = [];
  @Input() placeholder = '';
  @Input() required = false;
  @Input() selectedValue: SelectModel | null = null;
  @Input() selectionList: Array<SelectModel> = [];
  @Input() selector = '';
  @Input() size = SizeEnum.FULL;
  @Input() tooltipError = '';
  @Output() emitSelected = new EventEmitter<SelectModel>();

  // Enums
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  sizeEnum = SizeEnum;
  tooltipPositionEnum = TooltipPositionEnum;
  tooltipThemeEnum = TooltipThemeEnum;
  tooltipTypesEnum = TooltipTypesEnum;

  formCtrl = new UntypedFormControl();

  get inputHasErrorGetter(): boolean {
    const formCtrl = this.formCtrl;
    if (!formCtrl) return false;

    const emptyAndRequired = !formCtrl.value && this.required;
    const formInvalid = formCtrl.invalid;
    const formMarkedAsInvalidByParentComponent = this.invalid;
    const touched = formCtrl.touched || formCtrl.dirty;

    return touched && (emptyAndRequired || formInvalid || formMarkedAsInvalidByParentComponent);
  }

  get selectClasses(): string {
    return this.customClass || 'select-container__' + this.size;
  }

  /** Angular lifecycle start */
  ngOnChanges(changes: SimpleChanges): void {
    if (!this.formCtrl || !changes) return;

    if (changes['disableSelect']) {
      this.setDisableState(changes['disableSelect'].currentValue);
    }

    if (changes['required']) {
      this.setRequiredState(changes['required'].currentValue);
    }

    /** Preselect value or reset it when the change detected  */
    this.formCtrl.patchValue(this.selectedValue?.value ?? null);
  }
  /** Angular lifecycle end */

  /** Material Select methods and events start */

  compareFunction(o1: any, o2: any): boolean {
    // Empty option selected
    if (o2 === null) {
      this.formCtrl?.patchValue(null);
      this.selectedValue = null;
      return false;
    }

    if (o1.key == o2 || o1.value == o2) {
      this.selectedValue = o1;
      this.formCtrl?.patchValue(this.selectedValue?.value);
      return true;
    }

    return false;
  }

  onChange(event: MatSelectChange): void {
    this.selectedValue = event?.value || {
      dirty: true,
      value: null,
      key: null
    };
    this.selectedValue!.dirty = this.formCtrl?.dirty;
    this.formCtrl?.patchValue(this.selectedValue?.value);
    this.formCtrl?.markAsTouched();
    this.emitSelected.emit(this.selectedValue!);
  }

  /** Material Select methods and events end */

  /** State and validation methods start */

  setDisableState(disableSelect: boolean): void {
    this.disableSelect || disableSelect ? this.formCtrl?.disable() : this.formCtrl?.enable();
    this.formCtrl?.updateValueAndValidity();
  }

  setRequiredState(required: boolean): void {
    this.required || required
      ? this.formCtrl?.setValidators(Validators.required)
      : this.formCtrl?.removeValidators(Validators.required);
    this.formCtrl?.updateValueAndValidity();
  }

  /** State and validation methods end */

}
