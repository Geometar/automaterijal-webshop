import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

// Imports
import { AutomIconComponent } from '../autom-icon/autom-icon.component';

// Enums
import { SizeEnum, TooltipPositionEnum, TooltipThemeEnum, TooltipTypesEnum } from '../../data-models/enums';

// Data models
import { IconModel } from '../../data-models/interface';
import { AutomTooltipDirective } from '../autom-tooltip/autom-tooltip.directive';

@Component({
  selector: 'app-autom-label',
  standalone: true,
  imports: [CommonModule, AutomIconComponent, AutomTooltipDirective],
  templateUrl: './autom-label.component.html',
  styleUrl: './autom-label.component.scss'
})
export class AutomLabelComponent {
  @Input() label = '';
  @Input() labelIcons: Array<IconModel> = [];
  @Input() required = false;
  @Input() size = SizeEnum;
  @Output() eventEmitter = new EventEmitter<string>();

  sizeEnum = SizeEnum;
  tooltipPosition = TooltipPositionEnum;
  tooltipTheme = TooltipThemeEnum;
  tooltipType = TooltipTypesEnum;

  requiredTooltip = 'REQUIRED';

}
