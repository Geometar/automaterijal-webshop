import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { AutomIconComponent } from '../autom-icon/autom-icon.component';
import { ButtonComponent } from '../button/button.component';
import { PopupComponent } from '../popup/popup.component';
import { TextAreaComponent } from '../text-area/text-area.component';
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  PositionEnum,
  SizeEnum,
} from '../../data-models/enums';

@Component({
  selector: 'autom-dead-stock-override-popup',
  standalone: true,
  imports: [
    CommonModule,
    AutomIconComponent,
    ButtonComponent,
    PopupComponent,
    TextAreaComponent,
  ],
  templateUrl: './dead-stock-override-popup.component.html',
  styleUrl: './dead-stock-override-popup.component.scss',
})
export class DeadStockOverridePopupComponent implements OnChanges {
  @Input() articleLabel = '';
  @Input() loading = false;
  @Input() nextSuppressed = true;
  @Input() reason: string | null = '';
  @Input() visible = false;

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<string>();

  draftReason = '';

  buttonThemes = ButtonThemes;
  buttonTypes = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  get confirmLabel(): string {
    return this.nextSuppressed ? 'Sakrij za kupca' : 'Vrati kupcu';
  }

  get description(): string {
    return this.nextSuppressed
      ? 'Artikal će biti sakriven kupcu, ali ostaje vidljiv adminu kao mrtav lager kandidat.'
      : 'Artikal će ponovo biti vidljiv kupcu samo ako i dalje ispunjava mrtav lager pravila.';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['reason'] || changes['visible']) {
      this.draftReason = this.reason ?? '';
    }
  }

  requestClose(): void {
    if (this.loading) {
      return;
    }
    this.close.emit();
  }

  requestConfirm(): void {
    if (this.loading) {
      return;
    }
    this.confirm.emit(this.draftReason.trim());
  }
}
