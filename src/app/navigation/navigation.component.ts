import { Component, HostListener, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';

// Automaterijal import
import { AutomIconComponent } from '../shared/components/autom-icon/autom-icon.component';

// Enums
import { ColorEnum, IconsEnum } from '../shared/data-models/enums';

@Component({
  selector: 'autom-navigation',
  standalone: true,
  imports: [AutomIconComponent, CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class NavigationComponent implements OnInit {

  currentUrl: string = '';

  //Enums
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;

  // Misc
  fixedHeaderClass = false;
  mobileSidebarOpen = false;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentUrl = event.urlAfterRedirects;
        console.log('Current URL:', this.currentUrl);
      }
    });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.fixedHeaderClass = window.scrollY > 90;
  }
}
