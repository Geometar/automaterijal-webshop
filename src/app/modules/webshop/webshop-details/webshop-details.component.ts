import { Component, HostListener, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, Subject, takeUntil } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

// Enums
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  InputTypeEnum,
  PositionEnum,
  SizeEnum,
  TooltipPositionEnum,
  TooltipSubPositionsEnum,
  TooltipThemeEnum,
  TooltipTypesEnum,
} from '../../../shared/data-models/enums';

// Data Models
import {
  Roba,
  RobaBrojevi,
  TecDocDokumentacija,
} from '../../../shared/data-models/model/roba';
import { TooltipModel } from '../../../shared/data-models/interface';

// Components imports
import { AddAttributesComponent } from './add-atributes/add-atributes.component';
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { PopupComponent } from '../../../shared/components/popup/popup.component';
import { RsdCurrencyPipe } from '../../../shared/pipe/rsd-currency.pipe';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner.component';
import { TextAreaComponent } from '../../../shared/components/text-area/text-area.component';
import { YouTubePlayer } from '@angular/youtube-player';

// Services
import { AccountStateService } from '../../../shared/service/state/account-state.service';
import { CartStateService } from '../../../shared/service/state/cart-state.service';
import { PictureService } from '../../../shared/service/utils/picture.service';
import { RobaService } from '../../../shared/service/roba.service';
import { SeoService } from '../../../shared/service/seo.service';
import { SnackbarService } from '../../../shared/service/utils/snackbar.service';
import { TecdocService } from '../../../shared/service/tecdoc.service'

@Component({
  selector: 'app-webshop-details',
  standalone: true,
  imports: [
    AddAttributesComponent,
    AutomIconComponent,
    ButtonComponent,
    CommonModule,
    InputFieldsComponent,
    PopupComponent,
    RouterLink,
    RsdCurrencyPipe,
    SpinnerComponent,
    TextAreaComponent,
    YouTubePlayer,
  ],
  providers: [CurrencyPipe],
  templateUrl: './webshop-details.component.html',
  styleUrl: './webshop-details.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class WebshopDetailsComponent implements OnInit, OnDestroy {
  id: number | null = null;
  data: Roba = new Roba();

  // Enums
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  // Misc
  editingText = false;
  isAdmin = false;
  loading = false;
  quantity: number = 1;
  sanitizedText: SafeHtml = '';
  showAddAttributes = false;
  showDeleteWarningPopup = false;
  showImageDeleteWarningPopup = false;

  // Tooltip
  pdfToolTip = {
    position: TooltipPositionEnum.TOP,
    subPosition: TooltipSubPositionsEnum.SUB_CENTER,
    theme: TooltipThemeEnum.DARK,
    tooltipText: 'PDF Document',
    type: TooltipTypesEnum.TEXT,
  } as TooltipModel;

  // Data
  documentKeys: string[] = [];
  oeNumbers: Map<string, string[]> = new Map();

  private destroy$ = new Subject<void>();

  @HostListener('document:keydown.escape', ['$event'])
  onEscape() {
    this.showDeleteWarningPopup = false;
    this.showImageDeleteWarningPopup = false;
  }

  constructor(
    private accountStateService: AccountStateService,
    private cartStateService: CartStateService,
    private pictureService: PictureService,
    private robaService: RobaService,
    private route: ActivatedRoute,
    private sanitizer: DomSanitizer,
    private seoService: SeoService,
    private snackBar: SnackbarService,
    private snackbarService: SnackbarService,
    private tecDocService: TecdocService,
  ) { }

  /** Start of: Angular lifecycle hooks */

  ngOnInit(): void {
    this.id = +this.route.snapshot.paramMap.get('id')!;
    if (this.id) {
      this.fetchData(this.id);
    }

    this.isAdmin = this.accountStateService.isAdmin();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** End of: Angular lifecycle hooks */

  /** Start of: API event */

  fetchData(id: number): void {
    this.loading = true;
    this.robaService
      .fetchDetails(id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (response: Roba) => {
          this.pictureService.convertByteToImage(response);
          this.data = response;
          this.fillDocumentation();
          this.fillOeNumbers();
          this.setSanitizedText();
          this.updateSeoTags(response);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        },
      });
  }

  openPdf(doc: TecDocDokumentacija) {
    this.tecDocService
      .getDocumentBytes(doc.docId!)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: ArrayBuffer) => {
        if (res) {
          const blob = new Blob([res], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          window.open(url); // Open in a new tab
        }
      });
  }

  openLink(doc: TecDocDokumentacija) {
    window.open(doc.docUrl, '_blank');
  }


  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.id) return;

    const file = input.files[0];

    this.loading = true;
    this.robaService
      .uploadImage(this.id, file)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: () => {
          this.snackbarService.showSuccess('Image uploaded successfully');
          this.fetchData(this.id!); // refresh details to get new image
        },
        error: () => {
          this.snackbarService.showError('Image upload failed');
        },
      });
  }


  removeAttributes(): void {
    this.robaService.removeTecDocAttributes(this.data.robaid!).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.showSuccess('Atributi uspešno izbrisani');
        this.showDeleteWarningPopup = false;
        this.refreshDetails();
      },
      error: () => {
        this.snackBar.showSuccess('Greška pri brisanju atributa');
        this.showDeleteWarningPopup = false;
      }
    });
  }


  removeImage(): void {
    this.robaService.removeImage(this.data.robaid!).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.showSuccess('Atributi uspešno izbrisani');
        this.showDeleteWarningPopup = false;
        this.refreshDetails();
      },
      error: () => {
        this.snackBar.showSuccess('Greška pri brisanju atributa');
        this.showDeleteWarningPopup = false;
      }
    });
  }


  saveTextDescription(): void {
    this.robaService.saveText(this.data.robaid!, this.data.tekst!).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.showSuccess('Opis uspešno sačuvan');
        this.editingText = false;
        this.refreshDetails();
      },
      error: () => {
        this.snackBar.showError('Greška pri čuvanju opisa');
        this.editingText = false;
      },
    });
  }

  /** End of: API event */

  fillDocumentation() {
    if (!this.data.dokumentacija) {
      return;
    }

    for (const data of Object.entries(this.data.dokumentacija!)) {
      (data[1] as TecDocDokumentacija[]).forEach(
        (value: TecDocDokumentacija) => {
          if (
            value.docFileTypeName!.toUpperCase().indexOf('URL') > -1 &&
            value.docUrl
          ) {
            // Updated regex to handle youtube-nocookie.com and standard YouTube URLs
            const videoIdMatch = value.docUrl.match(
              /(?:youtube(-nocookie)?\.com\/embed\/|youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/
            );

            if (videoIdMatch && videoIdMatch[2]) {
              value.saniraniUrl = videoIdMatch[2]; // Extract and store only the video ID
            }
          }
          if (
            value.docFileTypeName!.toUpperCase().indexOf('JPEG') > -1 &&
            value.dokument
          ) {
            value.dokument = this.pictureService.convertByteToImageByte(
              value.dokument
            );
          }
        }
      );
    }

    if (this.data.dokumentacija != null) {
      for (const key of Object.keys(this.data.dokumentacija)) {
        this.documentKeys.push(key);
      }
    }
  }

  fillOeNumbers(): void {
    if (!this.data.tdBrojevi || this.data.tdBrojevi.length === 0) {
      return;
    }

    this.data.tdBrojevi.forEach((value: RobaBrojevi) => {
      const manufactures: string[] = this.oeNumbers.get(value.fabrBroj!) ?? [];
      manufactures.push(value.proizvodjac!);
      this.oeNumbers.set(value.fabrBroj!, manufactures);
    });
  }

  setSanitizedText(): void {
    if (this.data?.tekst) {
      const textWithBreaks = this.data.tekst.replace(/\n/g, '<br>');
      this.sanitizedText = this.sanitizer.bypassSecurityTrustHtml(textWithBreaks);
    }
  }

  getDocumentByKey(key: string): TecDocDokumentacija[] {
    return this.fetchDocument(key);
  }

  fetchDocument(key: string): TecDocDokumentacija[] {
    for (const data of Object.entries(this.data.dokumentacija!)) {
      if (data[0] === key) {
        return data[1] as TecDocDokumentacija[];
      }
    }
    return [];
  }

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
    this.cartStateService.addToCart(this.data, this.quantity);
    this.snackbarService.showSuccess('Artikal je dodat u korpu');
  }

  /**
   * Admin tools: Start
   */

  triggerImageUpload(): void {
    const input = document.getElementById('imageUpload') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  editAttributes(): void {
    this.showAddAttributes = true;
  }

  editDescription(): void {
    this.editingText = !this.editingText;
  }

  refreshDetails(): void {
    if (this.showAddAttributes) {
      this.showAddAttributes = false;
    }

    if (this.showDeleteWarningPopup) {
      this.showDeleteWarningPopup = false;
    }

    if (this.showImageDeleteWarningPopup) {
      this.showImageDeleteWarningPopup = false;
    }

    this.fetchData(this.id!);
  }

  toggleTextEdit(): void {
    this.editingText = !this.editingText;
  }

  textChanged(event: string): void {
    this.data.tekst = event;
  }

  cancelTextEdit(): void {
    this.editingText = false;
  }

  /**
   * Admin tools: End
   */

  private updateSeoTags(roba: Roba): void {
    const brand = roba.proizvodjac?.naziv?.trim() ?? '';
    const name = roba.naziv?.trim() ?? '';
    const sku = roba.katbr?.trim() ?? '';
    const id = roba.robaid ?? '';
    const price = roba.cena ?? undefined;         // broj (RSD)
    const inStock = (roba.stanje ?? 0) > 0;
    const productImg = roba.slika?.slikeUrl || ''; // bolje od logotipa
    const logoFallback = 'https://www.automaterijal.com/images/logo/logo.svg';

    // Title (≤ 60–65 znakova kad može)
    const baseTitle = [brand, name].filter(Boolean).join(' ');
    const title = sku ? `${baseTitle} (${sku}) | Automaterijal`
      : `${baseTitle} | Automaterijal`;

    // Meta description (≤ ~155–160c)
    const descBase = sku
      ? `Kupite ${brand} ${name} (${sku}) online. Proverena dostupnost, brza dostava, dokumentacija i OE brojevi.`
      : `Kupite ${brand} ${name} online. Proverena dostupnost, brza dostava, dokumentacija i OE brojevi.`;
    const description = descBase.slice(0, 158);

    const url = `https://www.automaterijal.com/webshop/${id}`;

    // JSON-LD Product
    const productJsonLd: any = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: baseTitle || name || brand || 'Proizvod',
      sku: sku || String(id),
      brand: brand ? { '@type': 'Brand', name: brand } : undefined,
      image: productImg || logoFallback,
      url,
      offers: {
        '@type': 'Offer',
        priceCurrency: 'RSD',
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        url,
        ...(price ? { price: String(price) } : {})
      }
    };

    // Og image alt (pristupačnost + bolji preview)
    const ogImageAlt = baseTitle || (brand && name ? `${brand} ${name}` : 'Automaterijal proizvod');

    // Ako tvoj seoService prima “extras”, prosledi ih; u suprotnom proširi servis
    this.seoService.updateSeoTags({
      title,
      description,
      url,
      type: 'product',
      image: productImg || logoFallback,
      // dodatne OG/Twitter stvari
      siteName: 'Automaterijal',
      locale: 'sr_RS',
      imageAlt: ogImageAlt,
      twitterCard: 'summary_large_image',
      // canonical preporuka
      canonical: url
    });

    // JSON-LD (ako imaš metodu u servisu)
    this.seoService.updateJsonLd(productJsonLd);
  }
}
