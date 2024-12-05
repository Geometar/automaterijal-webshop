import { Component, HostListener, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

// Automaterijal import
import { AutomIconComponent } from '../shared/components/autom-icon/autom-icon.component';

// Enums
import { ColorEnum, IconsEnum } from '../shared/data-models/enums';

@Component({
  selector: 'autom-navigation',
  standalone: true,
  imports: [AutomIconComponent, CommonModule],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class NavigationComponent {

  //Enums
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;

  // Misc
  fixedHeaderClass = false;
  mobileSidebarOpen = false;

  @HostListener('window:scroll')
  onScroll(): void {
    this.fixedHeaderClass = window.scrollY > 90;
  }
}
