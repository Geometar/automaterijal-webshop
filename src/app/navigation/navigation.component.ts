import { Component, HostListener, Inject, OnInit, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

  constructor(private router: Router, @Inject(PLATFORM_ID) private platformId: object) { }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.currentUrl = event.urlAfterRedirects;
          window.scrollTo(0, 0);
        }
      });
    }
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.fixedHeaderClass = window.scrollY > 90;
    }
  }
}
