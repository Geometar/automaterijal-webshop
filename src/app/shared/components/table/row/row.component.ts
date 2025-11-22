import { Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';

// Component imports
import { AutomIconComponent } from '../../autom-icon/autom-icon.component';
import { ButtonComponent } from '../../button/button.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputFieldsComponent } from '../../input-fields/input-fields.component';
import { MetaPillComponent } from '../../meta-pill/meta-pill.component';

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
import { StringUtils } from '../../../utils/string-utils';
import { PictureService, ProductImageMeta } from '../../../service/utils/picture.service';

@Component({
  selector: 'row',
  standalone: true,
  imports: [
    AutomIconComponent,
    ButtonComponent,
    CommonModule,
    FormsModule,
    InputFieldsComponent,
    MetaPillComponent,
    ReactiveFormsModule,
    RouterModule,
    RsdCurrencyPipe,
  ],
  providers: [CurrencyPipe],
  templateUrl: './row.component.html',
  styleUrl: './row.component.scss',
})
export class RowComponent implements OnInit, OnChanges {
  @Input() data!: Roba;
  @Input() showAddToBasket = false;
  @Input() showCloseBtn = false;
  @Input() showPriceOnly = false;
  @Output() removeEvent = new EventEmitter<number>();

  quantity: number = 1;
  private readonly minQuantity = 1;

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
  readonly categorySuffix = '›';

  // Misc
  hasMoreThanFiveSpecs = false;
  isEmployee = false;
  showAllSpecs = false;
  categoryHref: string | null = null;
  categoryLinkSegments: string[] | null = null;

  stringUtils = StringUtils;

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
    private accountStateService: AccountStateService,
    private pictureService: PictureService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.computeCategoryLink();
      this.quantity = this.clampQuantity(this.data?.kolicina ?? this.quantity);
    }
  }

  ngOnInit() {
    this.isEmployee = this.accountStateService.isEmployee();
    this.quantity = this.clampQuantity(this.data.kolicina ?? this.quantity);
    this.updateDisplayedSpecs();
    this.computeCategoryLink();
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
    if (this.isUnavailable) {
      this.quantity = this.minQuantity;
      return;
    }

    const next = this.clampQuantity(quantity);
    if (this.quantity === next) {
      return;
    }

    this.quantity = next;
    this.cartStateService.updateQuantity(this.data.robaid!, this.quantity);
  }

  addToShoppingCart(data: Roba): void {
    if (this.isUnavailable || !this.hasValidPrice) {
      this.snackbarService.showError('Artikal trenutno nije dostupan za poručivanje');
      return;
    }

    this.cartStateService.addToCart(data, this.quantity);
    this.snackbarService.showSuccess('Artikal je dodat u korpu');
  }

  isInCart(robaId: number): boolean {
    return this.cartStateService.isInCart(robaId);
  }

  openImageZoom(url: string) {
    this.zoomedImageUrl = url;
  }

  getProductSlug(data: any): string {
    return StringUtils.productSlug(data?.proizvodjac?.naziv, data?.naziv, data?.katbr);
  }

  getRouteParam(data: any): string | null {
    const id = data?.robaid;
    if (id == null) {
      return null;
    }
    const slug = this.getProductSlug(data);
    return slug ? `${id}-${slug}` : String(id);
  }

  get productImageMeta(): ProductImageMeta {
    return this.pictureService.buildProductImageMeta(this.data);
  }

  getProductImageSrc(): string {
    return this.productImageMeta.src;
  }

  getProductImageAlt(): string {
    return this.productImageMeta.alt;
  }

  getProductImageTitle(): string {
    return this.productImageMeta.title;
  }

  get categoryAriaLabel(): string | null {
    const groupName = this.data?.grupaNaziv?.trim();
    const subName = this.data?.podGrupaNaziv?.trim();

    if (!groupName && !subName) {
      return null;
    }

    if (groupName && subName) {
      return `Prikaži kategoriju ${groupName} / ${subName}`;
    }

    return `Prikaži kategoriju ${groupName ?? subName}`;
  }

  get effectiveStock(): number {
    return this.hasValidPrice ? this.data?.stanje ?? 0 : 0;
  }

  get isUnavailable(): boolean {
    return this.data.podGrupa !== 1000000 && this.effectiveStock <= 0;
  }

  private computeCategoryLink(): void {
    const groupName = this.data?.grupaNaziv?.trim();
    const subName = this.data?.podGrupaNaziv?.trim();

    if (!groupName) {
      this.categoryHref = null;
      this.categoryLinkSegments = null;
      return;
    }

    const segments = ['/webshop', 'category', StringUtils.slugify(groupName)];

    if (subName) {
      segments.push(StringUtils.slugify(subName));
    }

    this.categoryLinkSegments = segments;
    this.categoryHref = segments.join('/');
  }

  private get hasValidPrice(): boolean {
    const price = Number(this.data?.cena) || 0;
    return price > 0;
  }

  private clampQuantity(value: number): number {
    if (!Number.isFinite(value)) return this.minQuantity;
    if (value < this.minQuantity) return this.minQuantity;
    const max = this.effectiveStock || this.minQuantity;
    if (value > max) return max;
    return Math.floor(value);
  }
}
