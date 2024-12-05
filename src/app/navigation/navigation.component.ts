import { Component, HostListener, ViewEncapsulation } from '@angular/core';
import { AutomIconComponent } from '../shared/components/autom-icon/autom-icon.component';
import { ColorEnum, IconsEnum } from '../shared/data-models/enums';
import { CommonModule } from '@angular/common';

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
