import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild } from '@angular/core';
import { HeadingLevelEnum } from '../../data-models/enums/heading.enum';
import { ButtonThemes, ButtonTypes, IconButtonThemes, TooltipPositionEnum, TooltipTypesEnum } from '../../data-models/enums';
import { HeaderData } from '../../data-models/interface/header.interface';
import { ButtonComponent } from '../button/button.component';
import { AutomIconComponent } from '../autom-icon/autom-icon.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'autom-header',
  standalone: true,
  imports: [CommonModule, ButtonComponent, AutomIconComponent],
  templateUrl: './autom-header.component.html',
  styleUrl: './autom-header.component.scss'
})
export class AutomHeaderComponent {
  @Input() headerData = {} as HeaderData;
  @Input() headingLevel = HeadingLevelEnum.H1;
  @Input() isPage = true;
  @Input() stickyHeader = false;
  @Output() headerAction = new EventEmitter<any>();

  @ViewChild('dropdownMenu') dropdownMenu!: ElementRef;
  @ViewChild('notificationButton') toggleButton!: ElementRef;

  buttonThemes = ButtonThemes;
  buttonTypes = ButtonTypes;
  headingLevelEnum = HeadingLevelEnum;
  iconButtonThemes = IconButtonThemes;
  tooltipPositionEnum = TooltipPositionEnum;
  tooltipTypesEnum = TooltipTypesEnum;

  isDropdownOpen = false;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const targetElement = event.target as HTMLElement;
    // Exclude clicks on the button and dropdown menu
    if (
      this.isDropdownOpen &&
      !this.dropdownMenu.nativeElement.contains(targetElement) &&
      !this.toggleButton.nativeElement.contains(targetElement)
    ) {
      this.isDropdownOpen = false;
    }
  }
}
