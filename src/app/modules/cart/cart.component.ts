import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { finalize, Subject, takeUntil } from 'rxjs';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { SelectModel } from '../../shared/data-models/interface';

// Components imports
import { ButtonComponent } from '../../shared/components/button/button.component';
import { InputFieldsComponent } from '../../shared/components/input-fields/input-fields.component';
import { RowComponent } from '../../shared/components/table/row/row.component';
import { SelectComponent } from '../../shared/components/select/select.component';
import { TextAreaComponent } from '../../shared/components/text-area/text-area.component';

// Data models
import {
  Account,
  Cart,
  Invoice,
  InvoiceItem,
  ValueHelp,
} from '../../shared/data-models/model';
import { Roba } from '../../shared/data-models/model/roba';

// Enums
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  InputTypeEnum,
} from '../../shared/data-models/enums';

// Pipes
import { RsdCurrencyPipe } from '../../shared/pipe/rsd-currency.pipe';

// Service
import { AccountStateService } from '../../shared/service/utils/account-state.service';
import { CartService } from '../../shared/service/cart.service';
import { CartStateService } from '../../shared/service/utils/cart-state.service';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { EMAIL_ADDRESS } from '../../shared/data-models/constants/input.constants';
import { InvoiceService } from '../../shared/service/invoice.service';
import { SnackbarPosition, SnackbarService } from '../../shared/service/utils/snackbar.service';
import { Router, RouterLink } from '@angular/router';
import { AutomIconComponent } from '../../shared/components/autom-icon/autom-icon.component';


@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [
    AutomIconComponent,
    ButtonComponent,
    CommonModule,
    FormsModule,
    InputFieldsComponent,
    ReactiveFormsModule,
    RouterLink,
    RowComponent,
    RsdCurrencyPipe,
    SelectComponent,
    TextAreaComponent,
  ],
  providers: [CurrencyPipe],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CartComponent implements OnInit, OnDestroy {
  // Data
  roba: Roba[] = [];

  // Data
  basket?: Cart;
  invoice?: Invoice;

  // Forms
  cartForm: UntypedFormGroup;
  userForm: UntypedFormGroup;

  // Enum
  buttonThemes = ButtonThemes;
  buttonTypes = ButtonTypes;
  colorEnum = ColorEnum;
  iconsEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum;

  // Misc
  account?: Account;
  bezPdv: number = 0;
  invoiceSubmitted = false;
  loggedIn = false;
  pdv: number = 0;
  total: number = 0;

  // Select config
  payingChoices: SelectModel[] = [];
  transportChoices: SelectModel[] = [];

  // Validator patterns
  emailAddressPattern = EMAIL_ADDRESS;

  private destroy$ = new Subject<void>();

  constructor(
    private accountStateService: AccountStateService,
    private cartService: CartService,
    private cartStateService: CartStateService,
    private fb: UntypedFormBuilder,
    private invoiceService: InvoiceService,
    private router: Router,
    private snackbarService: SnackbarService,
  ) {
    this.cartForm = this.fb.group({
      address: ['', Validators.required],
      comment: [''],
      payment: ['', Validators.required],
      transport: ['', Validators.required],
    });
    this.userForm = this.fb.group({
      city: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      name: ['', Validators.required],
      phone: ['', Validators.required],
      postalcode: ['', Validators.required],
      street: ['', Validators.required],
      surname: ['', Validators.required],
      pib: [''],
      comment: [''],
    });
  }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    this.getInformation();
    this.syncOnCartItemSize();
    this.account = this.accountStateService.get();
    this.loggedIn = this.accountStateService.isUserLoggedIn();
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

  setCartSelectionValue(control: string, value: string): void {
    this.cartForm.controls[control].setValue(value);
  }

  setUserSelectionValue(control: string, value: string): void {
    this.userForm.controls[control].setValue(value);
  }

  sumTotal(): void {
    let total = 0;
    this.roba
      .map((roba: Roba) => roba.kolicina! * roba.cena!)
      .forEach((value: number) => (total += value));

    this.total = total;
    this.pdv = total - total / 1.2;
    this.bezPdv = total / 1.2;
  }

  /** Basket send: start */

  submitInvoice(): void {
    this.invoiceSubmitted = true;
    this.buildInvoiceFromForm();
    this.invoiceService
      .submit(this.invoice!)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.invoiceSubmitted = false;
        })
      )
      .subscribe({
        next: (item: Roba[]) => {
          if (!item.length) {
            this.snackbarService.showAutoClose('Porudžbina je uspešno poslata i uskoro će biti obradjena.', SnackbarPosition.TOP);
            this.router.navigateByUrl('/webshop');
            this.cartStateService.resetCart();
          } else {
            // TODO: Add fallback
          }
        },
        error: () => { },
      });
  }

  buildInvoiceFromForm(): void {
    this.invoice = new Invoice();

    const isAnon = !this.loggedIn;

    // Set fields
    this.invoice.adresa = this.createValueHelp(
      isAnon ? 850 : this.account?.ppid!
    );
    this.invoice.nacinPlacanja = this.createValueHelp(
      isAnon ? 2 : this.cartForm.get('payment')?.value
    );
    this.invoice.nacinPrevoza = this.createValueHelp(
      isAnon ? 2 : this.cartForm.get('transport')?.value
    );

    this.invoice.detalji = this.roba.map((r) =>
      new InvoiceItem({
        robaId: r.robaid,
        naziv: r.naziv,
        kataloskiBroj: r.katbr,
        proizvodjac: r.proizvodjac,
        kolicina: r.kolicina,
        cena: r.cena,
        rabat: r.rabat,
        slika: r.slika,
      })
    );

    this.invoice.iznosNarucen = this.total;

    this.invoice.napomena = isAnon
      ? this.buildAnonymousNote()
      : this.buildLoggedUserNote();
  }

  createValueHelp(id: number): ValueHelp {
    const valueHelp = new ValueHelp();
    valueHelp.id = id;
    return valueHelp;
  }

  private buildAnonymousNote(): string {
    const f = this.userForm.controls;
    return [
      `Ime i Prezime: ${f['name'].value} ${f['surname'].value}`,
      `Telefon i Email: ${f['phone'].value} ${f['email'].value}`,
      `Adresa: ${f['street'].value}`,
      f['pib'].value ? `Tax ID (PIB): ${f['pib'].value}` : null,
      `Grad i Postal Code: ${f['city'].value} ${f['postalcode'].value}`,
      f['comment'].value ? `Komentar: ${f['comment'].value}` : null,
    ]
      .filter(Boolean)
      .join('; ') + ';';
  }

  private buildLoggedUserNote(): string {
    const method = this.transportChoices.find(
      (t) => t.key === this.cartForm.get('transport')?.value
    )?.value;

    const noteParts = [
      method ? `Nacin transporta: ${method}` : null,
      this.cartForm.get('address')?.value
        ? `Adresa: ${this.cartForm.get('address')?.value}`
        : null,
      this.cartForm.get('comment')?.value
        ? `Komentar: ${this.cartForm.get('comment')?.value}`
        : null,
    ];

    return noteParts.filter(Boolean).join('; ') + ';';
  }
  /** Basket send: end */
}
