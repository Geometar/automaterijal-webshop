import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
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
export class SelectComponent implements OnChanges {
  @Input() disabled = false;
  @Input() label = '';
  @Input() labelIcons: Array<IconModel> = [];
  @Input() placeholder = '';
  @Input() required = false;
  @Input() selectedValue: SelectModel | null = null;
  @Input() selectionList: Array<SelectModel> = [];

  @Output() emitSelected = new EventEmitter<SelectModel>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectionList'] || changes['selectedValue']) {
      const exists = this.selectionList.find(item => item.key === this.selectedValue?.key);

      if (this.required && (!this.selectedValue || !exists) && this.selectionList.length > 0) {
        this.selectedValue = this.selectionList[0];
      }

      if (!this.required || this.selectedValue) {
        this.emitSelected.emit(this.selectedValue ?? {} as SelectModel);
      }
    }
  }

  onSelectionChange(event: MatSelectChange) {
    this.selectedValue = event.value;
    this.emitSelected.emit(event.value);
  }

  compareFn = (a: SelectModel, b: SelectModel): boolean => {
    return a?.key === b?.key;
  };
}
