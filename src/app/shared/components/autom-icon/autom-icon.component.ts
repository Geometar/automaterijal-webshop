import { ColorEnum } from '../../data-models/enums/color.enum';
import { Component, Input, ViewEncapsulation } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { CommonModule } from '@angular/common';

// Directive
import { AutomTooltipDirective } from '../autom-tooltip/autom-tooltip.directive';

// Enums
import { AnimatedIconsEnum, IconsEnum, TooltipPositionEnum, TooltipThemeEnum, TooltipTypesEnum } from '../../data-models/enums';

// Data Models
import { TooltipModel } from '../../data-models/interface/tooltip.interface';

@Component({
  selector: 'autom-icon',
  standalone: true,
  imports: [CommonModule, MatIconModule, AutomTooltipDirective, MatBadgeModule],
  templateUrl: './autom-icon.component.html',
  styleUrl: './autom-icon.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class AutomIconComponent {

  @Input() badge: number = 0;
  @Input() color: ColorEnum = ColorEnum.RICH_BLACK;
  @Input() disabled = false;
  @Input() enableBadge = false;
  @Input() euLabels = false;
  @Input() source: string = '';
  @Input() tooltip = {} as TooltipModel;

  // Enums
  animatedIcon = AnimatedIconsEnum;
  colorEnum = ColorEnum;
  iconsEnum = IconsEnum;
  tooltipPosition = TooltipPositionEnum;
  tooltipTheme = TooltipThemeEnum;
  tooltipType = TooltipTypesEnum;

  zIndexClass = ['z-index--7'];

  iconList: Array<string> = [];

  get noFill(): boolean {
    const arr = Array.from([this.animatedIcon.CHECK_ANIMATED, this.animatedIcon.LOADING_SPINNER]) as Array<string>;

    return arr.indexOf(this.source) > -1;
  }

  get noStroke(): boolean {
    const arr = Array.from([
      this.iconsEnum.FLEETCHECK,
      this.iconsEnum.FORKLIFT,
      this.iconsEnum.REGROOVE_3,
      this.iconsEnum.REPAIR,
      this.iconsEnum.TIRE_ONLY,
      this.iconsEnum.TWENTY_FOUR_HOUR,
      this.iconsEnum.REGROOVE_3
    ]) as Array<string>;

    return arr.indexOf(this.source) > -1;
  }

  get tooltipData(): TooltipModel {
    const tooltip = {
      position: this.tooltip.position || this.tooltipPosition.TOP,
      theme: this.tooltip.theme || this.tooltipTheme.DARK,
      tooltipText: this.tooltip.tooltipText || '',
      type: this.tooltip.type || this.tooltipType.TEXT
    } as TooltipModel;

    return tooltip;
  }

  /* eslint-disable no-unused-vars */
  constructor(private iconRegistry: MatIconRegistry, private sanitizer: DomSanitizer) { }

  ngOnChanges(): void {
    this.setIcons();
  }

  setIcons(): void {
    this.iconRegistry.addSvgIcon(
      this.source,
      this.sanitizer.bypassSecurityTrustResourceUrl('images/icons/' + this.source + '.svg')
    );
  }
}
