import {
  ApplicationRef,
  ComponentRef,
  Directive,
  ElementRef,
  EmbeddedViewRef,
  HostListener,
  Injector,
  Input,
  OnDestroy,
  Inject,
  ViewContainerRef
} from '@angular/core';
import { DOCUMENT, DatePipe } from '@angular/common';

// Components
import { AutomTooltipComponent } from './autom-tooltip.component';

// Enums
import { TooltipPositionEnum, TooltipSubPositionsEnum, TooltipThemeEnum, TooltipTypesEnum } from '../../data-models/enums';

@Directive({
  selector: '[automTooltip]',
  standalone: true,
  providers: [DatePipe]
})
export class AutomTooltipDirective implements OnDestroy {
  @Input('automTooltip') tooltipText: any = ''; // The text for the tooltip to display
  @Input('automTooltipPosition') position = TooltipPositionEnum.RIGHT;
  @Input('automTooltipSubPosition') subPosition = TooltipSubPositionsEnum.SUB_CENTER;
  @Input('automTooltipTheme') theme = TooltipThemeEnum.DARK;
  @Input('automTooltipType') type = TooltipTypesEnum.TEXT;

  @Input('automTooltipCustomCssClasses') customCssClasses = new Array<string>();
  @Input() tooltipDisabled = false;
  @Input() showDelay = 100; // ms

  arrow: any;
  arrowElement!: HTMLElement;
  componentRef: ComponentRef<any> | null = null;
  padding = 15;
  timer: any;
  tooltip: any = null;
  tooltipColor = 'var(--figma-grey-900)';
  tooltipElement: HTMLElement | null = null;;

  tooltipTypesEnum = TooltipTypesEnum;
  tooltipPositionEnum = TooltipPositionEnum;
  tooltipSubPositionsEnum = TooltipSubPositionsEnum;

  internalDisable = false;

  constructor(
    // eslint-disable-next-line no-unused-vars
    private appRef: ApplicationRef,
    private viewContainerRef: ViewContainerRef,
    // eslint-disable-next-line no-unused-vars
    private date: DatePipe,
    // eslint-disable-next-line no-unused-vars
    private el: ElementRef,
    // eslint-disable-next-line no-unused-vars
    private injector: Injector,
    @Inject(DOCUMENT) private document: Document
  ) { }

  ngOnDestroy(): void {
    this.destroy();
  }

  destroy(): void {
    if (this.componentRef !== null && !this.internalDisable) {
      this.appRef.detachView(this.componentRef.hostView);
      this.componentRef.destroy();
      this.componentRef = null;
    }
    this.tooltip = null;
    this.internalDisable = this.tooltipDisabled;
  }

  @HostListener('mouseenter') onMouseEnter(): void {
    this.checkTooltipText();
    if (this.showDelay > 0) {
      this.timer = setTimeout(() => {
        this.buildTooltip();
      }, this.showDelay);
    } else {
      this.buildTooltip();
    }
  }

  @HostListener('mouseleave') onMouseLeave(): void {
    if (this.timer) clearTimeout(this.timer);
    this.destroy();
  }

  buildTooltip(): void {
    if (this.componentRef === null && !this.internalDisable && this.tooltipText) {
      this.initTooltipView();
      this.createTooltip();
      this.createArrow();
      this.setTooltipTheme();
      this.setTooltipPosition();
    }
  }

  checkTooltipText(): void {
    this.tooltipText && !this.tooltipDisabled ? (this.internalDisable = false) : (this.internalDisable = true);
  }

  initTooltipView(): void {
    const componentRef = this.viewContainerRef.createComponent(AutomTooltipComponent);
    this.tooltipElement = (componentRef.hostView as EmbeddedViewRef<any>).rootNodes[0] as HTMLElement;
    this.document.body.appendChild(this.tooltipElement);
    this.tooltipElement.setAttribute('class', 'tooltip-container');
    this.componentRef = componentRef;
  }

  createTooltip(): void {
    // Main Tooltip
    const tooltipInnerText = this.document.createElement('div');
    const textContainer = this.document.createElement('div');
    textContainer.setAttribute('class', 'tooltip-text-container');
    switch (this.type) {
      case this.tooltipTypesEnum.TEXT:
        tooltipInnerText.innerHTML = this.tooltipText.toString();
        break;
      case this.tooltipTypesEnum.DATE:
        tooltipInnerText.innerHTML = this.tooltipText.toString();
        break;
      case this.tooltipTypesEnum.AUDIT:
        tooltipInnerText.setAttribute('class', 'tooltip-audit');
        tooltipInnerText.innerHTML = this.formatAuditDetails();
        break;
      case this.tooltipTypesEnum.INFO:
        // set tooltip info header
        const tooltipInnerHeadline = this.createTooltipHeadline();
        textContainer.appendChild(tooltipInnerHeadline);

        // set tooltip info content
        tooltipInnerText.setAttribute('class', 'tooltip-info-content');
        tooltipInnerText.innerHTML = this.tooltipText.content.toString();
        break;
    }

    textContainer.appendChild(tooltipInnerText);

    this.tooltipElement?.appendChild(textContainer);
    this.tooltip = this.tooltipElement;
  }

  // workaround for the tests mocks
  getElementDimensions(): any {
    return {
      host: this.el.nativeElement.getBoundingClientRect(),
      tooltip: this.tooltipElement?.getBoundingClientRect(),
      arrow: this.arrow.getBoundingClientRect()
    };
  }

  setTooltipPosition(): void {
    let x, y;
    let arrowX, arrowY;

    const dimensions = this.getElementDimensions();
    const hostDims = dimensions.host;
    const tooltipDims = dimensions.tooltip;
    const arrowDims = dimensions.arrow;

    // how much bigger/smaller the tooltip is in comparison to the host element
    const offsetWidth = hostDims.width - tooltipDims.width;
    const offsetHeight = hostDims.height - tooltipDims.height;

    const offsetWidthArrow = Math.abs(tooltipDims.width - arrowDims.width);
    const offsetHeightArrow = Math.abs(tooltipDims.height - arrowDims.height);

    const t = 'transparent'; // transparent color

    // centered tooltip position
    switch (this.position) {
      case this.tooltipPositionEnum.TOP:
        x = hostDims.x + offsetWidth / 2;
        y = hostDims.y - tooltipDims.height - this.padding;

        arrowX = x + offsetWidthArrow / 2;
        arrowY = y + tooltipDims.height;
        this.arrowElement.style.borderColor = `${this.tooltipColor} ${t} ${t} ${t}`;
        break;
      case this.tooltipPositionEnum.BOTTOM:
        x = hostDims.x + offsetWidth / 2;
        y = hostDims.y + hostDims.height + this.padding;

        arrowX = x + offsetWidthArrow / 2;
        arrowY = y - arrowDims.height;
        this.arrowElement.style.borderColor = `${t} ${t} ${this.tooltipColor} ${t}`;
        break;
      case this.tooltipPositionEnum.LEFT:
        x = hostDims.x - tooltipDims.width - this.padding;
        y = hostDims.y + offsetHeight / 2;

        arrowX = x + tooltipDims.width;
        arrowY = y + offsetHeightArrow / 2;
        this.arrowElement.style.borderColor = `${t} ${t} ${t} ${this.tooltipColor}`;
        break;
      case this.tooltipPositionEnum.RIGHT:
        x = hostDims.x + hostDims.width + this.padding;
        y = hostDims.y + offsetHeight / 2;

        arrowX = x - arrowDims.width;
        arrowY = y + offsetHeightArrow / 2;
        this.arrowElement.style.borderColor = `${t} ${this.tooltipColor} ${t} ${t}`;
        break;
    }

    // shifted position for top and bot
    if (
      (this.position === this.tooltipPositionEnum.TOP || this.position === this.tooltipPositionEnum.BOTTOM) &&
      tooltipDims.width >= 2 * arrowDims.width
    ) {
      switch (this.subPosition) {
        case this.tooltipSubPositionsEnum.SUB_RIGHT:
          x += tooltipDims.width / 2 - arrowDims.width;
          break;
        case this.tooltipSubPositionsEnum.SUB_LEFT:
          x -= tooltipDims.width / 2 - arrowDims.width;
          break;
      }
    }

    // shifted position for left and right
    if (
      (this.position === this.tooltipPositionEnum.LEFT || this.position === this.tooltipPositionEnum.RIGHT) &&
      tooltipDims.height >= 2 * arrowDims.height
    ) {
      switch (this.subPosition) {
        case this.tooltipSubPositionsEnum.SUB_TOP:
          y -= tooltipDims.height / 2 - arrowDims.height;
          break;
        case this.tooltipSubPositionsEnum.SUB_BOTTOM:
          y += tooltipDims.height / 2 - arrowDims.height;
          break;
      }
    }

    if (this.tooltipElement) {
      this.tooltipElement.style.top = y?.toString() + 'px';
      this.tooltipElement.style.left = x?.toString() + 'px';
    }

    this.customCssClasses.forEach((cssClass: string) => {
      this.tooltipElement?.classList.add(cssClass);
    });

    this.arrowElement.style.top = arrowY?.toString() + 'px';
    this.arrowElement.style.left = arrowX?.toString() + 'px';
  }

  createTooltipHeadline(): HTMLDivElement {
    const tooltipHeadline = this.document.createElement('div');
    tooltipHeadline.setAttribute('class', 'tooltip-info-headline');
    tooltipHeadline.innerHTML = this.tooltipText.headline.toString();

    return tooltipHeadline;
  }

  createArrow(): void {
    this.arrowElement = this.document.createElement('div');
    this.arrowElement.setAttribute('class', 'pointing-arrow');
    this.tooltipElement?.appendChild(this.arrowElement);
    this.arrow = this.arrowElement;
  }

  setTooltipTheme(): void {
    const white = 'var(--figma-base-white)';

    switch (this.theme) {
      case 'light':
        this.tooltipColor = white;
        if (this.tooltipElement) {
          this.tooltipElement.style.boxShadow = 'var(--figma-shadow-lg)';
          this.tooltipElement.style.color = 'var(--figma-grey-700)';
        }
        break;
      case 'dark':
        this.tooltipColor = 'var(--figma-grey-900)';
        if (this.tooltipElement) {
          this.tooltipElement.style.color = white;
        }
        break;
    }
    if (this.tooltipElement) {
      this.tooltipElement.style.background = this.tooltipColor;
      this.tooltipElement.style.zIndex = 'var(--z-index-7)';
    }
  }

  formatAuditDetails(): string {
    let multilineText = '';
    for (const key in this.tooltipText) {
      const elem = this.tooltipText[key];
      let formattedValue = 'N/a';
      if (elem['value']) {
        if (elem['type'] === TooltipTypesEnum.DATE) {
          formattedValue = this.date.transform(elem['value'], 'medium') ?? '';
        } else {
          formattedValue = elem['value'].toString();
        }
      }
      multilineText += `${elem['label']}: ${formattedValue}<br />`;
    }

    return multilineText;
  }
}
