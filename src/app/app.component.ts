import { Component, DestroyRef, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavigationComponent } from './navigation/navigation.component';
import { Title } from '@angular/platform-browser';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Autom imports
import { FooterComponent } from "./footer/footer.component";

// Service
import { AccountStateService } from './shared/service/state/account-state.service';
import { AnalyticsService } from './shared/service/analytics.service';

@Component({
  selector: 'autom-root',
  standalone: true,
  imports: [NavigationComponent, RouterOutlet, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'automaterijal-web-erp';

  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly titleService = inject(Title);
  private readonly destroyRef = inject(DestroyRef);
  private readonly accountState = inject(AccountStateService);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        const pageTitle = this.titleService.getTitle();
        const account = this.accountState.get();
        this.analytics.trackPageView(event.urlAfterRedirects, pageTitle, account);
      });
  }
}
