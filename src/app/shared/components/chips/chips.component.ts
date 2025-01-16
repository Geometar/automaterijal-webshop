import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatLabel } from '@angular/material/form-field';

// Enums
import { IconsEnum } from '../../data-models/enums';

// Component Import
import { AutomIconComponent } from '../autom-icon/autom-icon.component';
import { MatChipsModule } from '@angular/material/chips';

export interface Chip {
  label: string;
  values: string[]
}

@Component({
  selector: 'autom-chips',
  standalone: true,
  imports: [CommonModule, MatChipsModule, MatLabel, AutomIconComponent],
  templateUrl: './chips.component.html',
  styleUrl: './chips.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ChipsComponent {
  @Input() chips: Chip[] = [];
  @Input() editable = false;
  @Input() removable = true;
  @Output() emitEvent = new EventEmitter<Chip>();

  // Enums
  iconSource = IconsEnum;

  remove(chip: Chip): void {
    this.emitEvent.emit(chip);
  }

}
