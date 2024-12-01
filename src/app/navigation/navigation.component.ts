import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'autom-navigation',
  standalone: true,
  imports: [],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss'
})
export class NavigationComponent {

  fixedHeaderClass = false;

  @HostListener('window:scroll')
  onScroll(): void {
    this.fixedHeaderClass = window.scrollY > 90;
  }
}
