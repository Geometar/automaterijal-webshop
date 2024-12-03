import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';

// Automaterijal import
import { AutomLabelComponent } from '../autom-label/autom-label.component';
import { BadgeComponent } from '../badge/badge.component';

// Data Models
import { CheckboxModel, IconModel, TooltipModel } from '../../data-models/interface';

// Enums
import { BadgeTypeEnum, OrientationEnum, SizeEnum } from '../../data-models/enums';

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [
    AutomLabelComponent,
    BadgeComponent,
    CommonModule,
    FormsModule,
    MatCheckboxModule,
    MatFormFieldModule,
    ReactiveFormsModule],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss'
})
export class CheckboxComponent implements OnInit, OnChanges {

  @Input() disableAll = false;
  @Input() horizontal = true;
  @Input() items: Array<CheckboxModel> = [];
  @Input() label = '';
  @Input() labelIcons: Array<IconModel> = [];
  @Input() required = false;
  @Input() selectAll = false;
  @Input() size = SizeEnum.FULL;
  @Input() theme = OrientationEnum.HORIZONTAL;
  @Input() tooltipData: TooltipModel | null = null;
  @Output() emitCheckbox = new EventEmitter<CheckboxModel>();
  @Output() emitSelected = new EventEmitter<any>();

  // Enums
  badgeType = BadgeTypeEnum;
  orientation = OrientationEnum;
  sizeEnum = SizeEnum;

  get checkboxClasses(): string {
    return 'cesarx-checkbox--' + this.size;
  }

  get isCardView(): boolean {
    return this.theme === this.orientation.CARD_HORIZONTAL || this.theme === this.orientation.CARD_VERTICAL;
  }

  ngOnInit(): void {
    if (this.selectAll) {
      this.items.unshift({
        all: true,
        checked: false,
        disabled: false,
        value: 'CCN.ALL'
      });

      /** Set the ALL option to checked state
       * if all the other options are selected
       */
      const found = this.items.some((item: CheckboxModel) => !item.all && !item.checked);
      if (!found) {
        this.items[0].checked = true;
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['disableAll']) {
      this.items.forEach((item: CheckboxModel) => {
        item.disabled = changes['disableAll'].currentValue;
      });
    }
  }

  onChange(checkboxItem: MatCheckboxChange, selected: CheckboxModel, index: number): void {
    this.items[index].checked = checkboxItem.checked;

    if (this.selectAll && selected.all) {
      if (checkboxItem.checked) {
        this.items.map((item: CheckboxModel) => {
          if (!item.all) {
            item.checked = true;
          }
          return item;
        });
      } else {
        this.items.map((item: CheckboxModel) => (item.checked = false));

        this.items[index].checked = checkboxItem.checked;
      }
    }

    /** if at least one of the items other then ALL
     * unselected uncheck the option ALL
     */
    if (this.items[0].all) {
      const found = this.items.some((item: CheckboxModel) => !item.all && !item.checked);

      this.items[0].checked = !found;
    }

    this.emitCheckbox.emit(this.items[index]);
    this.emitSelected.emit(this.items[index].checked);
  }
}
