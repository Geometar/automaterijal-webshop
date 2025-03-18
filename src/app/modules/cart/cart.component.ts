import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { SelectModel } from '../../shared/data-models/interface';

// Components imports
import { ButtonComponent } from '../../shared/components/button/button.component';
import { InputFieldsComponent } from '../../shared/components/input-fields/input-fields.component';
import { RowComponent } from '../../shared/components/table/row/row.component';
import { SelectComponent } from '../../shared/components/select/select.component';
import { TextAreaComponent } from '../../shared/components/text-area/text-area.component';

// Data models
import { Account, ValueHelp } from '../../shared/data-models/model';
import { Roba } from '../../shared/data-models/model/roba';

// Enums
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
} from '../../shared/data-models/enums';

// Pipes
import { RsdCurrencyPipe } from '../../shared/pipe/rsd-currency.pipe';

// Service
import { AccountStateService } from '../../shared/service/utils/account-state.service';
import { CartService } from '../../shared/service/cart.service';
import { CartStateService } from '../../shared/service/utils/cart-state.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    ButtonComponent,
    RowComponent,
    CommonModule,
    RsdCurrencyPipe,
    SelectComponent,
    InputFieldsComponent,
    TextAreaComponent
  ],
  providers: [CurrencyPipe],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CartComponent implements OnInit, OnDestroy {
  // Data
  roba: Roba[] = [];

  // Enum
  colorEnum = ColorEnum;
  buttonTypes = ButtonTypes;
  buttonThemes = ButtonThemes;

  // Misc
  account?: Account;
  bezPdv: number = 0;
  total: number = 0;
  pdv: number = 0;

  // Select config
  payingChoices: SelectModel[] = [];
  transportChoices: SelectModel[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private accountStateService: AccountStateService,
    private cartStateService: CartStateService,
    private cartService: CartService
  ) { }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    this.account = this.accountStateService.get();
    this.getInformation();
    this.syncOnCartItemSize();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Angular lifecycle hooks end */

  /** Init event: start */

  getInformation(): void {
    this.cartService
      .getInformationAboutPaying()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (valueHelps: ValueHelp[]) => {
          this.payingChoices = valueHelps.map((value: ValueHelp) => {
            return { key: value.id, value: value.naziv } as SelectModel;
          });
        },
        error: () => {
          this.payingChoices = [];
        },
      });

    this.cartService
      .getInformationAboutTransport()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (valueHelps: ValueHelp[]) => {
          this.transportChoices = valueHelps.map((value: ValueHelp) => {
            return { key: value.id, value: value.naziv } as SelectModel;
          });
        },
        error: () => {
          this.transportChoices = [];
        },
      });
  }

  syncOnCartItemSize(): void {
    this.cartStateService.roba$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (roba: Roba[]) => {
        this.roba = roba;
        this.sumTotal();
      },
      error: () => {
        this.roba = [];
      },
    });
  }

  /** Init event: end */

  sumTotal(): void {
    let total = 0;
    this.roba
      .map((roba: Roba) => roba.kolicina! * roba.cena!)
      .forEach((value: number) => (total += value));

    this.total = total;
    this.pdv = (total - total / 1.2);
    this.bezPdv = total / 1.2;
  }
}
