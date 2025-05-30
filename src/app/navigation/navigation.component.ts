import {
  Component,
  HostListener,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule, CurrencyPipe, isPlatformBrowser } from '@angular/common';
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
import { ButtonComponent } from '../shared/components/button/button.component';
import { PopupComponent } from '../shared/components/popup/popup.component';
import { SwipeCloseDirective } from '../shared/components/directive/autom-swipe-close.directive';

// Data models
import { Account } from '../shared/data-models/model';

// Enums
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  PositionEnum,
  SizeEnum,
} from '../shared/data-models/enums';

// Service
import { CartStateService } from '../shared/service/utils/cart-state.service';
import { AccountService } from '../shared/auth/service/account.service';
import { LoginService } from '../shared/service/login.service';
import { RsdCurrencyPipe } from '../shared/pipe/rsd-currency.pipe';

@Component({
  selector: 'autom-navigation',
  standalone: true,
  imports: [
    AutomIconComponent,
    ButtonComponent,
    CommonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    PopupComponent,
    RouterLink,
    RouterLinkActive,
    RsdCurrencyPipe,
    SwipeCloseDirective,
  ],
  providers: [CurrencyPipe],
  templateUrl: './navigation.component.html',
  styleUrl: './navigation.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class NavigationComponent implements OnInit, OnDestroy {
  currentUrl: string = '';
  cartSize: number = 0;

  // Enums
  buttonThemes = ButtonThemes;
  buttonTypes = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  // Misc
  account: Account | null = null;
  fixedHeaderClass = false;
  isAdmin = false;
  loggedIn = false;
  mobileSidebarClosing = false;
  mobileSidebarOpen = false;
  showLogoutPopup = false;

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

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent) {
    if (this.mobileSidebarOpen) {
      this.closeMobileSidebar();
    }
  }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    // Subscribe to the state
    this.accountService.authenticationState.subscribe(
      (account: Account | null) => {
        if (account) {
          this.account = Object.assign(new Account(), account);

          this.loggedIn = true;
          this.isAdmin = this.account.isAdmin; // now it works ✅
        } else {
          this.account = null;
          this.loggedIn = false;
          this.isAdmin = false;
        }
      }
    );

    this.syncOnCartItemSize();

    if (isPlatformBrowser(this.platformId)) {
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          const parsedUrl = new URL(
            event.urlAfterRedirects,
            window.location.origin
          );
          this.currentUrl = parsedUrl.pathname;

          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 50);
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

  closeMobileSidebar(): void {
    this.mobileSidebarClosing = true;

    // Wait for the animation to finish, then remove the sidebar
    setTimeout(() => {
      this.mobileSidebarOpen = false;
      this.mobileSidebarClosing = false;
    }, 300); // match the CSS animation duration
  }

  logout() {
    this.loginService.logout();
  }

  openLogoutPopup(): void {
    this.showLogoutPopup = true;
  }

  closeLogoutPopup(): void {
    this.showLogoutPopup = false;
  }

  confirmLogout(): void {
    this.showLogoutPopup = false;
    this.logout();
  }
}
