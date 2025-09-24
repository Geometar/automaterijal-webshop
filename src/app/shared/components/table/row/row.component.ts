import { Component, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';

// Component imports
import { AutomIconComponent } from '../../autom-icon/autom-icon.component';
import { ButtonComponent } from '../../button/button.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputFieldsComponent } from '../../input-fields/input-fields.component';

// Data models
import { Roba } from '../../../data-models/model/roba';

// Enums
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  InputTypeEnum,
  SizeEnum,
} from '../../../data-models/enums';

// Pipes
import { RsdCurrencyPipe } from '../../../pipe/rsd-currency.pipe';

// Services
import { AccountStateService } from '../../../service/state/account-state.service';
import { CartStateService } from '../../../service/state/cart-state.service';
import { SnackbarService } from '../../../service/utils/snackbar.service';

@Component({
  selector: 'row',
  standalone: true,
  imports: [
    AutomIconComponent,
    ButtonComponent,
    CommonModule,
    FormsModule,
    InputFieldsComponent,
    ReactiveFormsModule,
    RouterModule,
    RsdCurrencyPipe,
  ],
  providers: [CurrencyPipe],
  templateUrl: './row.component.html',
  styleUrl: './row.component.scss',
})
export class RowComponent implements OnInit {
  @Input() data!: Roba;
  @Input() showAddToBasket = false;
  @Input() showCloseBtn = false;
  @Input() showPriceOnly = false;
  @Output() removeEvent = new EventEmitter<number>();

  quantity: number = 1;

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  sizeEnum = SizeEnum;

  // Data
  displayedLinkageCriteria: any[] = [];
  displayedTehnickiOpis: any[] = [];
  displayedSpecs: any[] = [];
  zoomedImageUrl: string | null = null;

  // Misc
  hasMoreThanFiveSpecs = false;
  isEmployee = false;
  showAllSpecs = false;

  get specTableId(): string {
    return `spec-${this.data?.robaid ?? 'row'}`;
  }

  get nameWithoutManufacturer(): string {
    const manufacturer = this.data.proizvodjac?.naziv?.trim();
    const name = this.data.naziv?.trim();

    if (!manufacturer || !name) return name ?? '';

    const regex = new RegExp(`^${manufacturer}\\s+`, 'i'); // starts with manufacturer + space
    return name.replace(regex, '');
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape() {
    this.zoomedImageUrl = null;
  }

  constructor(
    private cartStateService: CartStateService,
    private snackbarService: SnackbarService,
    private accountStateService: AccountStateService
  ) { }

  ngOnInit() {
    this.isEmployee = this.accountStateService.isEmployee();
    this.quantity = this.data.kolicina ?? this.quantity;
    this.updateDisplayedSpecs();
  }

  updateDisplayedSpecs() {
    const linkage = this.data.tdLinkageCriteria ?? [];
    const tehnickiOpis = this.data.tehnickiOpis ?? [];

    this.displayedLinkageCriteria = linkage;

    const totalSpecs = linkage.length + tehnickiOpis.length;
    this.hasMoreThanFiveSpecs = totalSpecs > 5;

    if (!this.hasMoreThanFiveSpecs) {
      this.showAllSpecs = false;
    }

    if (this.showAllSpecs || !this.hasMoreThanFiveSpecs) {
      this.displayedTehnickiOpis = tehnickiOpis;
    } else {
      const remainingSlots = Math.max(0, 5 - linkage.length);
      this.displayedTehnickiOpis = tehnickiOpis.slice(0, remainingSlots);
    }

    this.displayedSpecs = [...this.displayedLinkageCriteria, ...this.displayedTehnickiOpis];
  }

  toggleSpecifications() {
    this.showAllSpecs = !this.showAllSpecs;
    this.updateDisplayedSpecs();
  }

  modifyQuantity(quantity: number): void {
    if (this.data.kolicina === quantity) {
      return;
    }

    if (quantity < 1) {
      this.quantity = 1;
    } else if (quantity > this.data.stanje!) {
      this.quantity = this.data.stanje!;
    } else {
      this.quantity = quantity;
    }

    this.cartStateService.updateQuantity(this.data.robaid!, this.quantity);
  }

  addToShoppingCart(data: Roba): void {
    this.cartStateService.addToCart(data, this.quantity);
    this.snackbarService.showSuccess('Artikal je dodat u korpu');
  }

  isInCart(robaId: number): boolean {
    return this.cartStateService.isInCart(robaId);
  }

  openImageZoom(url: string) {
    this.zoomedImageUrl = url;
  }
}
