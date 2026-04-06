import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RowComponent } from './row.component';
import { AccountStateService } from '../../../service/state/account-state.service';
import { CartStateService } from '../../../service/state/cart-state.service';
import { SnackbarService } from '../../../service/utils/snackbar.service';
import { PictureService } from '../../../service/utils/picture.service';
import { SzakalStockService } from '../../../service/szakal-stock.service';
import { UrlHelperService } from '../../../service/utils/url-helper.service';

describe('RowComponent dead stock admin marker', () => {
  const accountState = {
    isAdmin: () => false,
    isEmployee: () => false,
    isUserLoggedIn: () => false,
    get: () => null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RowComponent],
      providers: [
        provideRouter([]),
        { provide: AccountStateService, useValue: accountState },
        {
          provide: CartStateService,
          useValue: {
            getItemKey: () => null,
            isInCartKey: () => false,
            isInCart: () => false,
            updateQuantityByKey: () => undefined,
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
        { provide: UrlHelperService, useValue: { addOrUpdateQueryParams: () => undefined, getCurrentPath: () => '/webshop' } },
      ],
    }).compileComponents();
  });

  function createRoba() {
    return {
      robaid: 202,
      naziv: 'Filter goriva',
      katbr: 'G-202',
      cena: 1200,
      stanje: 4,
      rabat: 0,
      availabilityStatus: 'IN_STOCK',
      proizvodjac: { naziv: 'Febi', proid: 'FEBI' },
      deadStockInfo: {
        candidate: true,
        matched: true,
        daysInDeadStock: 390,
        lastSaleDate: '2025-02-01',
        regularPrice: 1800,
      },
    } as any;
  }

  it('renders MRTAV LAGER marker and highlight only for admin', () => {
    accountState.isAdmin = () => true;
    const fixture = TestBed.createComponent(RowComponent);
    fixture.componentInstance.data = createRoba();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.row-container')?.classList.contains('row-container--dead-stock-admin')).toBeTrue();
    expect(element.querySelector('autom-meta-pill.product-meta__dead-stock')).not.toBeNull();
    expect(element.querySelector('.dead-stock-admin-note')?.textContent).toContain('390 dana bez prodaje');
  });

  it('does not render admin marker for customer', () => {
    accountState.isAdmin = () => false;
    const fixture = TestBed.createComponent(RowComponent);
    fixture.componentInstance.data = createRoba();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.row-container')?.classList.contains('row-container--dead-stock-admin')).toBeFalse();
    expect(element.querySelector('autom-meta-pill.product-meta__dead-stock')).toBeNull();
    expect(element.querySelector('.dead-stock-admin-note')).toBeNull();
  });
});
