import { Component } from '@angular/core';
import { InputFieldsComponent } from '../../shared/components/input-fields/input-fields.component';
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  SizeEnum,
} from '../../shared/data-models/enums';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { CommonModule } from '@angular/common';
import { AutomIconComponent } from '../../shared/components/autom-icon/autom-icon.component';

@Component({
  selector: 'app-webshop',
  standalone: true,
  imports: [
    InputFieldsComponent,
    ButtonComponent,
    CommonModule,
    AutomIconComponent,
  ],
  templateUrl: './webshop.component.html',
  styleUrl: './webshop.component.scss',
})
export class WebshopComponent {
  // Enums
  sizeEnum = SizeEnum;
  iconEnum = IconsEnum;
  colorEnum = ColorEnum;
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;

  categories = [
    {
      name: 'Maziv',
      icon: '🛢️', // Ikonica za maziva
      open: false,
      subcategories: [
        {
          name: 'Putnički Program',
          icon: '🚗', // Automobil putnički program
          open: false,
          subcategories: [
            { name: 'Motorno Ulje', icon: '🛠️' }, // Motor ulja
            { name: 'Ulja za menjač i diferencijal', icon: '⚙️' }, // Menjač i diferencijal
            { name: 'Antifriz', icon: '❄️' }, // Hlađenje
          ],
        },
        {
          name: 'Kamionski Program',
          icon: '🚛', // Kamion
          open: false,
          subcategories: [
            { name: 'Motorno Ulje', icon: '🛠️' },
            { name: 'Menjačko ulje', icon: '⚙️' },
            { name: 'Antifriz', icon: '❄️' },
          ],
        },
        { name: 'Antifriz', icon: '❄️' },
        { name: 'Kočiono Ulje', icon: '🚦' }, // Kočnice
        { name: 'Motosport', icon: '🏎️' }, // Trke
        { name: 'Industrijska ulja', icon: '🏭' }, // Industrija
        { name: 'Obrada metala', icon: '🔩' }, // Metalni delovi
      ],
    },
    {
      name: 'Akumulator',
      icon: '🔋', // Baterija za vozilo
      open: false,
      subcategories: [],
    },
    {
      name: 'Enterijer',
      icon: '🛠️', // Rad na unutrašnjosti
      open: false,
      subcategories: [
        { name: 'Patosnice', icon: '🚗' }, // Podne obloge
        { name: 'Presvlake', icon: '🪑' }, // Sedišta
        { name: 'Obloge', icon: '🛋️' }, // Zidni materijal
        { name: 'Držači za telefon', icon: '📱' }, // Telefoni
        { name: 'Punjaci za telefon', icon: '🔌' },
        { name: 'Jastuci', icon: '🛏️' }, // Komfort
        { name: 'Pomoćna ogledala', icon: '🔍' }, // Zamenik stakla
        { name: 'Programe za geek', icon: '💻' },
        { name: 'Univerzalno', icon: '🌐' }, // Opšti alati
      ],
    },
    {
      name: 'Aditivi',
      icon: '⚗️', // Hemikalije za gorivo
      open: false,
      subcategories: [],
    },
    {
      name: 'Kozmetika',
      icon: '🚘', // Sredstva za održavanje automobila
      open: false,
      subcategories: [
        { name: 'Jelkice', icon: '🌲' }, // Miris
        { name: 'Konzerve', icon: '🛢️' }, // Maziva
        { name: 'Igračke', icon: '🧸' }, // Dodaci
      ],
    },
    {
      name: 'Za čišćenje vozila',
      icon: '🚿', // Pranje vozila
      open: false,
      subcategories: [
        { name: 'Šamponi', icon: '🧴' },
        { name: 'Polir Paste', icon: '🧽' }, // Čistač
        { name: 'Sunđeri', icon: '🪣' },
        { name: 'Krpe', icon: '🧻' },
        { name: 'Pokrivači', icon: '🛡️' }, // Sigurnost
      ],
    },
    {
      name: 'Dodatna oprema',
      icon: '🛠️', // Oprema za vozilo
      open: false,
      subcategories: [
        { name: 'Krovni nosači', icon: '📦' }, // Transport
        { name: 'Pumpe za gume', icon: '⛽' }, // Pumpanje guma
        { name: 'Reparacija Gume', icon: '🛞' }, // Popravka guma
        { name: 'Španer za teret', icon: '🔗' },
        { name: 'Leave', icon: '🍂' }, // Nejasno - može se korigovati
        { name: 'Kantice', icon: '🪣' }, // Kanta
        { name: 'Traka za vuču', icon: '🪢' }, // Vučna traka
      ],
    },
  ];

  toggleSubMenu(category: any) {
    category.open = !category.open;
  }
}
