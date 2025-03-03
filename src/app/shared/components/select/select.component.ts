import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';

// Angular Material Modules
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

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
    ReactiveFormsModule],
  templateUrl: './select.component.html',
  styleUrl: './select.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class SelectComponent {
  @Input() label = '';
  @Input() labelIcons: Array<IconModel> = [];
  @Input() selectionList: Array<SelectModel> = [];
  @Output() emitSelected = new EventEmitter<SelectModel>();

  onSelectionChange(event: MatSelectChange) {
    this.emitSelected.emit(event.value);
  }

}
