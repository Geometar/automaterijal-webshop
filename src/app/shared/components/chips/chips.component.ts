import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatLabel } from '@angular/material/form-field';

// Enums
import { ButtonThemes, ButtonTypes, IconsEnum, TooltipPositionEnum, TooltipSubPositionsEnum } from '../../data-models/enums';

// Component Import
import { AutomIconComponent } from '../autom-icon/autom-icon.component';
import { AutomTooltipDirective } from '../autom-tooltip/autom-tooltip.directive';
import { ButtonComponent } from '../button/button.component';
import { MatChipsModule } from '@angular/material/chips';
import { TooltipModel } from '../../data-models/interface';

// Services
import { UrlHelperService } from '../../service/utils/url-helper.service';

export interface Chip {
  label: string;
  values: string[]
}

@Component({
  selector: 'autom-chips',
  standalone: true,
  imports: [CommonModule, MatChipsModule, MatLabel, AutomIconComponent, ButtonComponent, AutomTooltipDirective],
  templateUrl: './chips.component.html',
  styleUrl: './chips.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class ChipsComponent {
  @Input() chips: Chip[] = [];
  @Input() editable = false;
  @Input() removable = true;
  @Output() emitEvent = new EventEmitter<Chip>();

  constructor(private urlHelperService: UrlHelperService) { }

  // Enums
  iconSource = IconsEnum;
  buttonTypes = ButtonTypes;
  buttonThemes = ButtonThemes;

  remove(chip: Chip): void {
    this.emitEvent.emit(chip);
  }

  removeAll(): void {
    this.urlHelperService.clearQueryParams();
  }

  getChipText(chip: { label: string; values: string[] }): string {
    if (!chip?.values?.length) return '';
    if (chip.values.length === 1) return chip.values[0];
    // pokaži broj za čistoću UI-ja
    return `${chip.values.length} izabrano`;
  }

  getChipTitle(chip: { label: string; values: string[] }): string {
    const tooltip = {} as TooltipModel;
    tooltip.position = TooltipPositionEnum.TOP;
    tooltip.subPosition = TooltipSubPositionsEnum.SUB_CENTER;
    return tooltip.tooltipText = `${chip.label}: ${chip.values?.join(', ') ?? ''}`;
  }

}
