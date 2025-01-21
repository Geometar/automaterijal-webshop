import { Component, Input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';

// Data models
import { Roba } from '../../../data-models/model/roba';

// Enums
import { ButtonThemes, ButtonTypes, ColorEnum, IconsEnum, InputTypeEnum, SizeEnum } from '../../../data-models/enums';

// Pipes
import { RsdCurrencyPipe } from '../../../pipe/rsd-currency.pipe';

// Component imports
import { ButtonComponent } from '../../button/button.component';
import { InputFieldsComponent } from '../../input-fields/input-fields.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'row',
  standalone: true,
  imports: [InputFieldsComponent, ButtonComponent, CommonModule, RsdCurrencyPipe, FormsModule, ReactiveFormsModule],
  providers: [CurrencyPipe],
  templateUrl: './row.component.html',
  styleUrl: './row.component.scss'
})
export class RowComponent {
  @Input() data!: Roba;

  quantity: number = 1;

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  sizeEnum = SizeEnum;


  modifyQuantity(quantity: number): void {
    if (quantity < 1) {
      this.quantity = 1;
    } else if (quantity > this.data.stanje!) {
      this.quantity = this.data.stanje!;
    } else {
      this.quantity = quantity;
    }
  }

  addToShopingCart(): void {
    console.log(this.quantity);
  }
}
