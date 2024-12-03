import { CommonModule } from '@angular/common';
import { AfterViewChecked, AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';

import { DragDropModule } from '@angular/cdk/drag-drop';

// Angular Material Modules
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';

// Automaterijal imports
import { AutomIconComponent } from '../autom-icon/autom-icon.component';
import { ButtonComponent } from '../button/button.component';

// Enums
import { PositionEnum, SizeEnum } from '../../data-models/enums';

@Component({
  selector: 'app-popup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AutomIconComponent,
    ButtonComponent,
    MatFormFieldModule,
    ReactiveFormsModule,
    // CDK
    DragDropModule],
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.scss'
})
export class PopupComponent implements AfterViewInit {
  @Input() allowDrag = false;
  @Input() customLeft = 0;
  @Input() customPosition = false;
  @Input() customTop = 0;
  @Input() customWidth: number | null = null;
  @Input() height: SizeEnum = SizeEnum.AUTO;
  @Input() loading = false;
  @Input() narrowCard = false;
  @Input() overlay = true;
  @Input() position: PositionEnum = PositionEnum.RIGHT;
  @Input() rounded = false;
  @Input() subPosition: PositionEnum = PositionEnum.TOP;
  @Input() visible = true;
  @Input() width: SizeEnum = SizeEnum.AUTO;
  @Output() overlayEvent = new EventEmitter();
  @ViewChild('popupContainer') popupContainer?: ElementRef;

  // Enums
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  fullVW = false;

  get popupClasses(): Array<string> {
    const container = 'popup-container__' + this.position.toString() + '--' + this.subPosition.toString();
    const height = 'popup-container__height--' + this.height.toString();
    const width =
      this.fullVW && (this.height === SizeEnum.FULL || this.height === SizeEnum.FULL_VH)
        ? 'popup-container__width--full-vw'
        : 'popup-container__width--' + this.width.toString();
    return Array.from([container, height, width]);
  }

  @HostListener('window:resize', [])
  onResize(): void {
    this.getPopupSize();
  }

  ngAfterViewInit(): void {
    this.getPopupSize();
  }

  getPopupSize(): void {
    const bodyWidth = document.body.clientWidth;
    const popup = document.getElementById('popupContainer');

    this.fullVW = bodyWidth <= popup!.getBoundingClientRect()!.width;
  }

  onOverlayClick(): void {
    this.overlayEvent.emit();
  }

}
