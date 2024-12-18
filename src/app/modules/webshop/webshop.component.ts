import { Component } from '@angular/core';
import { InputFieldsComponent } from '../../shared/components/input-fields/input-fields.component';
import { ButtonThemes, ButtonTypes, ColorEnum, IconsEnum, SizeEnum } from '../../shared/data-models/enums';
import { ButtonComponent } from '../../shared/components/button/button.component';

@Component({
  selector: 'app-webshop',
  standalone: true,
  imports: [InputFieldsComponent, ButtonComponent],
  templateUrl: './webshop.component.html',
  styleUrl: './webshop.component.scss'
})
export class WebshopComponent {

  // Enums
  sizeEnum = SizeEnum;
  iconEnum = IconsEnum;
  colorEnum = ColorEnum;
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
}
