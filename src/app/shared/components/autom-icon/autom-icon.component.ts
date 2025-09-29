import { ColorEnum } from '../../data-models/enums/color.enum';
import { Component, Inject, Input, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';

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
  constructor(
    private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnChanges(): void {
    this.setIcons();
  }

  setIcons(): void {
    if (!this.source) {
      return;
    }

    const inline = INLINE_SVG_ICON_MAP[this.source];
    if (inline) {
      this.iconRegistry.addSvgIconLiteral(
        this.source,
        this.sanitizer.bypassSecurityTrustHtml(inline)
      );
      return;
    }

    if (!isPlatformBrowser(this.platformId)) {
      this.iconRegistry.addSvgIconLiteral(
        this.source,
        this.sanitizer.bypassSecurityTrustHtml('<svg xmlns="http://www.w3.org/2000/svg"></svg>')
      );
      return;
    }

    this.iconRegistry.addSvgIcon(
      this.source,
      this.sanitizer.bypassSecurityTrustResourceUrl('images/icons/' + this.source + '.svg')
    );
  }
}

const INLINE_SVG_ICON_MAP: Record<string, string> = {
  'align-justify': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 10H3M21 6H3M21 14H3M21 18H3" stroke="#18181B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  navigation: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 11L22 2L13 21L11 13L3 11Z" stroke="#18181B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};
