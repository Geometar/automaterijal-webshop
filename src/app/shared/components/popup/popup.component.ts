import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';

import { DragDropModule } from '@angular/cdk/drag-drop';

// Angular Material Modules
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';

// Animations
import { animate, style, transition, trigger } from '@angular/animations';

// Component imports
import { AutomIconComponent } from '../autom-icon/autom-icon.component';
import { ButtonComponent } from '../button/button.component';
import { SpinnerComponent } from '../spinner/spinner.component';

// Enums
import { PositionEnum, SizeEnum } from '../../data-models/enums';

@Component({
  selector: 'autom-popup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AutomIconComponent,
    ButtonComponent,
    MatFormFieldModule,
    ReactiveFormsModule,
    SpinnerComponent,
    // CDK
    DragDropModule],
  templateUrl: './popup.component.html',
  styleUrl: './popup.component.scss',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ],
  encapsulation: ViewEncapsulation.None
})
export class PopupComponent implements OnInit {
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

  // Misc
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

  ngOnInit(): void {
    this.getPopupSize();

  }

  getPopupSize(): void {
    const bodyWidth = window.innerWidth;
    const isMobile = bodyWidth <= 768;

    if (isMobile) {
      this.position = PositionEnum.BOTTOM;
      this.subPosition = PositionEnum.CENTER;
      this.width = SizeEnum.FULL;
      this.height = SizeEnum.AUTO;
      this.customPosition = false;
      this.fullVW = true;
    } else {
      this.fullVW = bodyWidth <= this.popupContainer?.nativeElement.offsetWidth;
    }
  }

  onOverlayClick(): void {
    this.overlayEvent.emit();
  }

}
