import { Component, HostListener, ViewEncapsulation } from '@angular/core';
import { AutomIconComponent } from '../shared/components/autom-icon/autom-icon.component';
import { ColorEnum, IconsEnum } from '../shared/data-models/enums';

@Component({
  selector: 'autom-navigation',
  standalone: true,
  imports: [AutomIconComponent],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class NavigationComponent {

  //Enums
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;

  fixedHeaderClass = false;

  @HostListener('window:scroll')
  onScroll(): void {
    this.fixedHeaderClass = window.scrollY > 90;
  }
}
