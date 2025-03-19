import {
  Component,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';

// Automaterijal import
import { AutomIconComponent } from '../shared/components/autom-icon/autom-icon.component';

// Data models
import { Account } from '../shared/data-models/model';

// Enums
import { ColorEnum, IconsEnum } from '../shared/data-models/enums';

// Service
import { CartStateService } from '../shared/service/utils/cart-state.service';
import { AccountService } from '../shared/auth/service/account.service';
import { LoginService } from '../shared/service/login.service';

@Component({
  selector: 'autom-navigation',
  standalone: true,
  imports: [
    AutomIconComponent,
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatMenuModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class NavigationComponent implements OnInit, OnDestroy {
  currentUrl: string = '';
  cartSize: number = 0;

  // Enums
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;

  // Misc
  account: Account | null = null;
  fixedHeaderClass = false;
  loggedIn = false;
  mobileSidebarOpen = false;

  private destroy$ = new Subject<void>();

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private accountService: AccountService,
    private cartStateService: CartStateService,
    private loginService: LoginService,
    private router: Router
  ) { }

  @HostListener('window:scroll')
  onScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.fixedHeaderClass = window.scrollY > 90;
    }
  }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    // Always trigger identity resolution on init
    this.accountService.identity().subscribe(); // this kicks off the loading if needed

    // Subscribe to the state
    this.accountService.authenticationState.subscribe((account: Account | null) => {
      this.account = account;
      this.loggedIn = !!account;
    });

    this.syncOnCartItemSize();

    if (isPlatformBrowser(this.platformId)) {
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          const parsedUrl = new URL(
            event.urlAfterRedirects,
            window.location.origin
          );
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

  syncOnCartItemSize(): void {
    this.cartStateService.cartSize$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (cartSize: number) => {
        this.cartSize = cartSize;
      },
      error: () => {
        this.cartSize = 0;
      },
    });
  }

  logout() {
    this.loginService.logout();
  }
}
