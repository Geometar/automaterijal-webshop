import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';

// Angular Material Modules
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Component imports
import { AutomLabelComponent } from '../autom-label/autom-label.component';

// Data Models
import { IconModel } from '../../data-models/interface';
import { SelectModel } from '../../data-models/interface/selected-item.interface';


@Component({
  selector: 'autom-select',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSelectModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    AutomLabelComponent],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class SelectComponent {
  @Input() label = '';
  @Input() labelIcons: Array<IconModel> = [];
  @Input() placeholder = '';
  @Input() required = false;
  @Input() selectedValue: SelectModel | null = null;

  private _selectionList: Array<SelectModel> = [];
  @Input()
  set selectionList(value: Array<SelectModel>) {
    this._selectionList = value;

    if (
      this.required &&
      (!this.selectedValue || !this._selectionList.find(item => item.key === this.selectedValue?.key)) &&
      this._selectionList.length > 0
    ) {
      this.selectedValue = this._selectionList[0];
      this.emitSelected.emit(this.selectedValue);
    }
  }
  get selectionList(): Array<SelectModel> {
    return this._selectionList;
  }

  @Output() emitSelected = new EventEmitter<SelectModel>();

  onSelectionChange(event: MatSelectChange) {
    this.selectedValue = event.value;
    this.emitSelected.emit(event);
  }
}
