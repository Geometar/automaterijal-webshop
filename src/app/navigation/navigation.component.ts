import { Component, HostListener, Inject, OnDestroy, OnInit, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Automaterijal import
import { AutomIconComponent } from '../shared/components/autom-icon/autom-icon.component';
import { ButtonComponent } from "../shared/components/button/button.component";

// Data models
import { Account } from '../shared/data-models/model';

// Enums
import { ColorEnum, IconsEnum } from '../shared/data-models/enums';

// Service
import { CartStateService } from '../shared/service/utils/cart-state.service';
import { AccountStateService } from '../shared/service/utils/account-state.service';

@Component({
  selector: 'autom-navigation',
  standalone: true,
  imports: [AutomIconComponent, CommonModule, RouterLink, RouterLinkActive, ButtonComponent],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class NavigationComponent implements OnInit, OnDestroy {

  currentUrl: string = '';
  cartSize: number = 0;

  // Enums
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;

  // Misc
  account?: Account;
  fixedHeaderClass = false;
  mobileSidebarOpen = false;

  private destroy$ = new Subject<void>();

  constructor(private accountStateService: AccountStateService, private router: Router, @Inject(PLATFORM_ID) private platformId: object, private cartStateService: CartStateService) { }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    this.account = this.accountStateService.get();
    this.syncOnCartItemSize();
    if (isPlatformBrowser(this.platformId)) {
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          const parsedUrl = new URL(event.urlAfterRedirects, window.location.origin);
          this.currentUrl = parsedUrl.pathname;
          window.scrollTo(0, 0);
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Angular lifecycle hooks end */

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.fixedHeaderClass = window.scrollY > 90;
    }
  }

  syncOnCartItemSize(): void {
    this.cartStateService.cartSize$
      .pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: (cartSize: number) => { this.cartSize = cartSize; },
        error: () => { this.cartSize = 0; }
      });
  }
}
