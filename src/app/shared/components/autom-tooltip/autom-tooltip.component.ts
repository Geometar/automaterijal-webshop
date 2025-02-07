import { Component, Input, ViewEncapsulation } from '@angular/core';

// Enums
import { TooltipPositionEnum, TooltipSubPositionsEnum, TooltipThemeEnum, TooltipTypesEnum } from '../../data-models/enums/tooltip.enum';
import { ButtonThemes, ButtonTypes } from '../../data-models/enums/button.enum';
import { AutomTooltipDirective } from './autom-tooltip.directive';

@Component({
  selector: 'autom-tooltip',
  standalone: true,
  imports: [AutomTooltipDirective],
  templateUrl: './autom-tooltip.component.html',
  styleUrl: './autom-tooltip.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class AutomTooltipComponent {
  @Input() isVisible = false;
  @Input() position = TooltipPositionEnum.RIGHT;
  @Input() showDelay = 100;
  @Input() subPosition = TooltipSubPositionsEnum.SUB_CENTER;
  @Input() theme = TooltipThemeEnum.DARK;
  @Input() tooltipDisabled = false;
  @Input() tooltipText: any = 'Tooltip Text'; // The text for the tooltip to display
  @Input() type = TooltipTypesEnum.TEXT;

  buttonTypes = ButtonTypes;
  buttonThemes = ButtonThemes;
}
