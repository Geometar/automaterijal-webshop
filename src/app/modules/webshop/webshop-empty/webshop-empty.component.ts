import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

// Enums
import { IconsEnum } from '../../../shared/data-models/enums';

// Component Imports
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';

// Service
import { UrlHelperService } from '../../../shared/service/utils/url-helper.service';

@Component({
  selector: 'webshop-empty',
  standalone: true,
  imports: [AutomIconComponent, CommonModule],
  templateUrl: './webshop-empty.component.html',
  styleUrl: './webshop-empty.component.scss'
})
export class WebshopEmptyComponent {
  iconEnum = IconsEnum;

  constructor(private urlHelperService: UrlHelperService) { }

  brands = [
    { src: '/images/brands/shell.png', alt: 'Shell', label: 'Shell', id: 'SHELL' },
    { src: '/images/brands/lukoil.png', alt: 'Lukoil', label: 'Lukoil', id: 'LKOIL' },
    { src: '/images/brands/fuchs.png', alt: 'Fuchs', label: 'Fuchs', id: 'FUCHS' },
    { src: '/images/brands/febi.png', alt: 'Febi', label: 'Febi', id: 'FEBI' },
    { src: '/images/brands/bilstain.png', alt: 'Bilstain', label: 'Bilstain', id: 'BIL' },
    { src: '/images/brands/blue_print.png', alt: 'Blue Print', label: 'Blue Print', id: 'BLUE' },
    { src: '/images/brands/hiq.png', alt: 'HiQ', label: 'HiQ', id: 'HIQ' },
    { src: '/images/brands/mahle.png', alt: 'Mahle', label: 'Mahle', id: 'MAHL' },
    { src: '/images/brands/fleetguard.png', alt: 'Fleetguard', label: 'Fleetguard', id: 'FTG' },
    { src: '/images/brands/victor_reinz.png', alt: 'Victor Reinz', label: 'Victor Reinz', id: 'VR' },
    { src: '/images/brands/pierburg.png', alt: 'Pierburg', label: 'Pierburg', id: 'PIERB' },
    { src: '/images/brands/kolbenschmidt.png', alt: 'Kolbenschmidt', label: 'Kolbenschmidt', id: 'KS' },
    { src: '/images/brands/magneti_marelli.png', alt: 'Magneti Marelli', label: 'Magneti Marelli', id: 'MAGNM' },
    { src: '/images/brands/bottari.png', alt: 'Bottari', label: 'Bottari', id: 'BOTT' },
    { src: '/images/brands/energizer.png', alt: 'Energizer', label: 'Energizer', id: 'ENERG' },
  ];

  categories = [
    { src: '/images/groups/maziva-putnicki.png', alt: 'Maziva', label: 'Maziva - putnicki program', id: 'MPU' },
    { src: '/images/groups/maziva-teretni.png', alt: 'Maziva', label: 'Maziva - teretni program', id: 'MTR' },
    { src: '/images/groups/maziva-obradametala.png', alt: 'Maziva', label: 'Maziva - Obrada metala', id: 'MOM' },
    { src: '/images/groups/maziva-industrija.png', alt: 'Maziva', label: 'Maziva - Industrijski program', id: 'MIZ' },
    { src: '/images/groups/maziva-ostalo.png', alt: 'Maziva', label: 'Maziva - ostalo', id: 'MOS' },
    { src: '/images/groups/alati.png', alt: 'Alati', label: 'Alati', id: 'ALATI' },
    { src: '/images/groups/kozmetika.png', alt: 'Maziva', label: 'Kozmetika', id: 'NAZI' },
    { src: '/images/groups/odrzavanje-vozila.png', alt: 'Maziva', label: 'Odrzavanje vozila', id: 'OD' },
    { src: '/images/groups/oprema-auta.png', alt: 'Maziva', label: 'Praktična auto oprema.', id: 'UD' },
    { src: '/images/groups/auto_enterijer.png', alt: 'Maziva', label: 'Auto Enterijer', id: 'UNIDO' },
  ];

  filterByBrand(id: string): void {
    this.urlHelperService.addOrUpdateQueryParams({ "mandatoryproid": id });
  }

  filterByCategory(id: string): void {
    this.urlHelperService.addOrUpdateQueryParams({ "grupe": id });
  }
}
