import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatRadioChange, MatRadioModule } from '@angular/material/radio';
import { CommonModule } from '@angular/common';

// Automaterijal import
import { AutomIconComponent } from '../autom-icon/autom-icon.component';
import { AutomLabelComponent } from '../autom-label/autom-label.component';
import { AutomTooltipDirective } from '../autom-tooltip/autom-tooltip.directive';

// Interface
import { IconModel, RadioOption } from '../../data-models/interface';

// Enums
import { ColorEnum, OrientationEnum, SizeEnum, TooltipPositionEnum } from '../../data-models/enums';

@Component({
  selector: 'autom-radio-button',
  standalone: true,
  imports: [CommonModule, AutomIconComponent, AutomLabelComponent, MatRadioModule, AutomTooltipDirective],
  templateUrl: './radio-button.component.html',
  styleUrl: './radio-button.component.scss'
})
export class RadioButtonComponent implements OnInit {
  @Input() disableRadioButtons = false;
  @Input() displaySubtitle = false;
  @Input() hideRadioButtons = false;
  @Input() hideValue = false;
  @Input() label = '';
  @Input() labelIcons: Array<IconModel> = [];
  @Input() options: Array<RadioOption> = [];
  @Input() required = false;
  @Input() size: SizeEnum = SizeEnum.SMALL;
  @Input() theme = OrientationEnum.HORIZONTAL;
  @Output() emitSelected: EventEmitter<RadioOption> = new EventEmitter<RadioOption>();

  colorEnum = ColorEnum;
  orientation = OrientationEnum;
  tooltipPosition = TooltipPositionEnum;

  get isCardView(): boolean {
    return this.theme === this.orientation.CARD_HORIZONTAL || this.theme === this.orientation.CARD_VERTICAL;
  }

  get radioClasses(): string {
    return 'radio-button-container--' + this.size;
  }

  get hideRadioGroup(): boolean {
    return this.options.every((option: RadioOption) => option.hidden);
  }

  ngOnInit(): void {
    // Disable all radio buttons at once
    if (this.disableRadioButtons) {
      this.options.forEach((option: RadioOption) => {
        option.disabled = true;
      });
    }

    // Hide all radio buttons at once
    if (this.hideRadioButtons) {
      this.options.forEach((option: RadioOption) => {
        option.hidden = true;
      });
    }
  }

  onChange(event: MatRadioChange): void {
    this.options.forEach((option: RadioOption) => {
      option.checked = option.value === event.value;
    });

    const value = this.options.find((option: RadioOption) => option.value === event.value);

    this.emitSelected.emit(value);
  }
}
