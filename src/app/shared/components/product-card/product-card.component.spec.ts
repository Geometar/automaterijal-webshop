import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AutomProductCardComponent } from './product-card.component';
import { AccountStateService } from '../../service/state/account-state.service';
import { CartStateService } from '../../service/state/cart-state.service';
import { SnackbarService } from '../../service/utils/snackbar.service';
import { PictureService } from '../../service/utils/picture.service';
import { SzakalStockService } from '../../service/szakal-stock.service';

describe('AutomProductCardComponent dead stock admin marker', () => {
  const accountState = {
    isAdmin: () => false,
    isEmployee: () => false,
    isUserLoggedIn: () => false,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutomProductCardComponent],
      providers: [
        provideRouter([]),
        { provide: AccountStateService, useValue: accountState },
        {
          provide: CartStateService,
          useValue: {
            getItemKey: () => null,
            isInCartKey: () => false,
            addToCart: () => undefined,
            updateStockForItem: () => undefined,
          },
        },
        { provide: SnackbarService, useValue: { showError: () => undefined, showSuccess: () => undefined } },
        {
          provide: PictureService,
          useValue: {
            buildProductImageMeta: () => ({ src: '/test.png', alt: 'test', title: 'test' }),
          },
        },
        { provide: SzakalStockService, useValue: { check: () => undefined } },
      ],
    }).compileComponents();
  });

  function createRoba() {
    return {
      robaid: 101,
      naziv: 'Filter ulja',
      katbr: 'F-101',
      cena: 1000,
      stanje: 5,
      rabat: 0,
      availabilityStatus: 'IN_STOCK',
      proizvodjac: { naziv: 'Bosch', proid: 'BOSCH' },
      deadStockInfo: {
        candidate: true,
        matched: true,
        daysInDeadStock: 420,
        lastSaleDate: '2025-01-15',
        regularPrice: 1500,
      },
    } as any;
  }

  it('renders MRTAV LAGER marker and highlight only for admin', () => {
    accountState.isAdmin = () => true;
    const fixture = TestBed.createComponent(AutomProductCardComponent);
    fixture.componentInstance.roba = createRoba();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.product-card')?.classList.contains('product-card--dead-stock-admin')).toBeTrue();
    expect(element.querySelector('.product-katbr--admin-strong')?.textContent).toContain('MRTAV LAGER');
    expect(element.querySelector('.product-katbr--admin-signal')?.textContent).toContain('420 dana bez prodaje');
  });

  it('does not render admin marker for customer', () => {
    accountState.isAdmin = () => false;
    const fixture = TestBed.createComponent(AutomProductCardComponent);
    fixture.componentInstance.roba = createRoba();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.product-card')?.classList.contains('product-card--dead-stock-admin')).toBeFalse();
    expect(element.querySelector('.product-katbr--admin-strong')).toBeNull();
    expect(element.querySelector('.product-katbr--admin-signal')).toBeNull();
  });
});
