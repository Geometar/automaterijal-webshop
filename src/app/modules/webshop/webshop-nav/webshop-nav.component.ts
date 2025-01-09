import {
  Component,
  Input,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';


// Enums
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  SizeEnum,
} from '../../../shared/data-models/enums';

// Component Imports
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';

// Service
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';

export class NavTitles {
  title: string = '';
  svg: IconsEnum = IconsEnum.SEARCH;
}

@Component({
  selector: 'webshop-nav',
  standalone: true,
  imports: [
    ButtonComponent,
    InputFieldsComponent,
    CommonModule,
    AutomIconComponent,
  ],
  templateUrl: './webshop-nav.component.html',
  styleUrl: './webshop-nav.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class WebshopNavComponent {
  @Input() searchTerm = '';

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  sizeEnum = SizeEnum;

  navigationTitles: NavTitles[] = [
    { title: 'Pretraga', svg: IconsEnum.SEARCH } as NavTitles,
    { title: 'Alati', svg: IconsEnum.TOOLS } as NavTitles,
    { title: 'Maziva', svg: IconsEnum.OIL } as NavTitles,
    { title: 'Aditivi', svg: IconsEnum.ADDITIVES } as NavTitles,
    { title: 'Odrzavanje Vozila', svg: IconsEnum.SPONGE } as NavTitles,
    { title: 'Enterijer', svg: IconsEnum.CAR_ENTERIER } as NavTitles,
  ];

  constructor(private urlHelperService: UrlHelperService) { }

  emitValue(): void {
    this.urlHelperService.addOrUpdateQueryParams({ searchTerm: this.searchTerm.trim() });
  }
}
