import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

// Automaterijal import
import { AutomIconComponent } from '../autom-icon/autom-icon.component';

// Data Models
import { ButtonCounter } from '../../data-models/interface';

// Enums
import { ButtonThemes, ButtonTypes, ColorEnum, IconButtonThemes, PositionEnum } from '../../data-models/enums';

@Component({
  selector: 'autom-button',
  standalone: true,
  imports: [CommonModule, AutomIconComponent],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss'
})
export class ButtonComponent {

  // optional inputs
  @Input() counter?: ButtonCounter = { position: PositionEnum.LEFT, showCounter: false, value: 0 };
  @Input() disabled? = false;
  @Input() iconOnlyMode? = false;
  @Input() iconPrefix? = false;
  @Input() iconSource?: string | null = null;
  @Input() iconColor: ColorEnum = ColorEnum.RICH_BLACK;
  @Input() label? = 'button';
  @Input() tabindex: number | null = null;
  // mandatory inputs
  @Input() theme: ButtonThemes | IconButtonThemes = ButtonThemes.DEFAULT;
  @Input() type: ButtonTypes = ButtonTypes.PRIMARY;
  // outputs
  @Output() clickEvent = new EventEmitter<Event>();

  // Enums
  buttonTypes = ButtonTypes;
  positionEnum = PositionEnum;

  ngOnInit(): void {
    // allow for any parent component threads to complete
    setTimeout(() => {
      this.validateIconOnlyMode();
      this.validateIconPrefix();
    });
  }

  validateIconOnlyMode(): void {
    if (this && this.iconOnlyMode && !this.iconSource) {
      throw Error(
        `Attempting to use the shared button component in [icon only mode], but without an icon asset provided.`
      );
    }
  }

  validateIconPrefix(): void {
    if (this && this.iconPrefix && !this.iconSource) {
      throw Error(
        `Attempting to use the shared button component with an [icon prefix], but without an icon asset provided.`
      );
    }
  }
}
