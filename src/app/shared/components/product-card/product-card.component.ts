import { Component, Input, Output, EventEmitter, ViewEncapsulation, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Automaterijal import
import { AutomIconComponent } from '../autom-icon/autom-icon.component';
import { ButtonComponent } from '../button/button.component';
import { InputFieldsComponent } from '../input-fields/input-fields.component';

// Data models
import { Roba } from '../../data-models/model/roba';

// Enums
import { ColorEnum, IconsEnum, InputTypeEnum, SizeEnum } from '../../data-models/enums';

// Pipes  
import { RsdCurrencyPipe } from '../../pipe/rsd-currency.pipe';

@Component({
  selector: 'autom-product-card',
  standalone: true,
  imports: [
    CommonModule,
    AutomIconComponent,
    ButtonComponent,
    InputFieldsComponent,
    FormsModule,
    ReactiveFormsModule,
    RsdCurrencyPipe
  ],
  providers: [CurrencyPipe],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AutomProductCardComponent implements OnInit {
  @Input() roba!: Roba;
  @Output() onClick = new EventEmitter<number>();
  @Output() addToCart = new EventEmitter<{ roba: Roba; quantity: number }>();

  quantity = 1;

  iconEnum = IconsEnum;
  colorEnum = ColorEnum;
  inputTypeEnum = InputTypeEnum;
  sizeEnum = SizeEnum;

  ngOnInit(): void {
    if (this.roba?.kolicina && this.roba.kolicina > 0) {
      this.quantity = this.roba.kolicina;
    }
  }

  handleClick(): void {
    if (this.roba?.robaid) {
      this.onClick.emit(this.roba.robaid);
    }
  }

  handleAddToCart(): void {
    if (this.roba && this.quantity > 0) {
      this.addToCart.emit({ roba: this.roba, quantity: this.quantity });
    }
  }

  modifyQuantity(value: number): void {
    if (value < 1) {
      this.quantity = 1;
    } else if (value > (this.roba?.stanje ?? 1)) {
      this.quantity = this.roba.stanje ?? 1;
    } else {
      this.quantity = value;
    }
  }

  get hasDiscount(): boolean {
    return !!this.roba.rabat;
  }

  get oldPrice(): number {
    return this.roba.cena! / (1 - this.roba.rabat / 100);
  }

  get isOutOfStock(): boolean {
    return (this.roba.podGrupa !== 1000000) && this.roba.stanje === 0;
  }

  get isTecDocOnly(): boolean {
    return this.roba.podGrupa === 1000000;
  }

  get isInCart(): boolean {
    return !!this.roba.uKorpi;
  }
}