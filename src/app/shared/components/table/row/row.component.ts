import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
import { CartStateService } from '../../../service/utils/cart-state.service';
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

  // Misc
  hasMoreThanFiveSpecs = false;
  showAllSpecs = false;

  constructor(
    private cartStateService: CartStateService,
    private snackbarService: SnackbarService
  ) { }

  ngOnInit() {
    this.updateDisplayedSpecs();
  }

  updateDisplayedSpecs() {
    this.displayedLinkageCriteria = this.data.tdLinkageCriteria || [];

    const totalDisplayedCount = this.displayedLinkageCriteria.length;

    // Only trim tehnickiOpis if total items exceed 5
    if (totalDisplayedCount >= 5) {
      this.displayedTehnickiOpis = []; // No space for tehnickiOpis
    } else {
      const remainingSlots = 5 - totalDisplayedCount;
      this.displayedTehnickiOpis = this.data.tehnickiOpis
        ? this.data.tehnickiOpis.slice(0, remainingSlots)
        : [];
    }

    // Check if there are more than 5 rows in total
    this.hasMoreThanFiveSpecs =
      this.displayedLinkageCriteria.length +
      (this.data.tehnickiOpis?.length || 0) >
      5;
  }

  toggleSpecifications() {
    this.showAllSpecs = !this.showAllSpecs;
    this.displayedTehnickiOpis = this.showAllSpecs
      ? this.data.tehnickiOpis ?? []
      : this.data.tehnickiOpis!.slice(
        0,
        Math.max(0, 5 - this.displayedLinkageCriteria.length)
      );
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
}
