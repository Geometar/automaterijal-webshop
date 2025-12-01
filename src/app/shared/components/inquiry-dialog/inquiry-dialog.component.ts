import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { finalize } from 'rxjs';

import { AutomIconComponent } from '../autom-icon/autom-icon.component';
import { ButtonComponent } from '../button/button.component';
import { InputFieldsComponent } from '../input-fields/input-fields.component';
import { PopupComponent } from '../popup/popup.component';
import { TextAreaComponent } from '../text-area/text-area.component';

import { ButtonThemes, ButtonTypes, IconsEnum, InputTypeEnum, PositionEnum, SizeEnum } from '../../data-models/enums';
import { EmailService } from '../../service/email.service';
import { AccountStateService } from '../../service/state/account-state.service';
import { SnackbarService } from '../../service/utils/snackbar.service';

@Component({
  selector: 'app-inquiry-dialog',
  standalone: true,
  imports: [AutomIconComponent, ButtonComponent, CommonModule, InputFieldsComponent, PopupComponent, TextAreaComponent],
  templateUrl: './inquiry-dialog.component.html',
  styleUrl: './inquiry-dialog.component.scss'
})
export class InquiryDialogComponent {
  @Input() open = false;
  @Input() productName = '';
  @Input() manufacturer?: string | null;
  @Input() katbr?: string | null;
  @Input() robaId?: number | null;
  @Input() prefilledEmail?: string | null;
  @Input() loggedIn = false;

  @Output() closed = new EventEmitter<void>();
  @Output() sent = new EventEmitter<void>();

  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;
  iconEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  inquiryContact = '';
  accountEmail: string | null = null;
  inquiryNote = '';
  inquiryPhone = '';
  inquirySending = false;
  inquirySent = false;

  constructor(
    private readonly emailService: EmailService,
    private readonly accountStateService: AccountStateService,
    private readonly snackbarService: SnackbarService
  ) { }

  ngOnInit(): void {
    this.prefill();
  }

  ngOnChanges(): void {
    this.prefill();
  }

  close(): void {
    this.closed.emit();
  }

  onInquiryContactChange(value: string): void {
    this.inquiryContact = (value ?? '').trimStart();
  }

  onInquiryNoteChange(value: string): void {
    this.inquiryNote = value ?? '';
  }

  onInquiryPhoneChange(value: string): void {
    this.inquiryPhone = (value ?? '').trim();
  }

  sendInquiry(): void {
    const account = this.accountStateService.get();
    const contact = this.inquiryContactTrim || this.accountEmail || '';

    if (!contact && !this.loggedIn) {
      this.snackbarService.showError('Unesi email da bismo te kontaktirali.');
      return;
    }
    if (contact && !this.isValidEmail(contact)) {
      this.snackbarService.showError('Unesi ispravan email.');
      return;
    }

    this.inquirySending = true;
    const payload = this.buildInquiryPayload(contact || null, account);

    this.emailService
      .posaljiPoruku(payload)
      .pipe(finalize(() => (this.inquirySending = false)))
      .subscribe({
        next: () => {
          this.inquirySent = true;
          this.snackbarService.showSuccess('Upit je poslat. Javićemo se uskoro.');
          this.sent.emit();
          this.close();
        },
        error: () => {
          this.snackbarService.showError('Slanje upita nije uspelo. Pokušaj ponovo.');
        }
      });
  }

  get inquiryContactTrim(): string {
    return (this.inquiryContact ?? '').trim();
  }

  private prefill(): void {
    this.loggedIn = this.accountStateService.isUserLoggedIn();
    const account = this.accountStateService.get();
    this.accountEmail = account?.email ?? null;
    if (this.accountEmail && !this.inquiryContact) {
      this.inquiryContact = this.accountEmail;
    }
    if (this.prefilledEmail && !this.inquiryContact) {
      this.inquiryContact = this.prefilledEmail;
    }

    if (!this.inquiryNote) {
      const name = this.productName ?? 'artikal';
      const kat = this.katbr ? ` (kat.br. ${this.katbr})` : '';
      const manufacturer = this.manufacturer ? ` | Proizvođač: ${this.manufacturer}` : '';
      const idPart = this.robaId ? ` | ID: ${this.robaId}` : '';
      this.inquiryNote = `Zanima me dostupnost / nabavka za ${name}${kat}${manufacturer}${idPart}.`;
    }
  }

  private buildInquiryPayload(contact: string | null, account: any) {
    const note = this.inquiryNote?.trim();
    const phone = this.loggedIn ? undefined : this.inquiryPhone?.trim();
    const parts = [
      'Upit za nabavku artikla',
      this.productName ? `${this.productName}` : null,
      this.manufacturer ? `Proizvođač: ${this.manufacturer}` : null,
      this.katbr ? `Kat.br: ${this.katbr}` : null,
      this.robaId ? `ID: ${this.robaId}` : null,
      account?.naziv ? `Korisnik: ${account.naziv}` : null,
      account?.ppid ? `PPID: ${account.ppid}` : null,
      contact ? `Email za odgovor: ${contact}` : null,
      phone ? `Telefon: ${phone}` : null,
      note ? `Napomena: ${note}` : null
    ].filter(Boolean);

    return {
      ime: account?.naziv || 'Web kupac',
      prezime: '',
      firma: account?.naziv || undefined,
      posta: contact || undefined,
      telefon: phone || undefined,
      poruka: parts.join(' | ')
    };
  }

  private isValidEmail(value: string): boolean {
    const email = value?.trim();
    if (!email) {
      return false;
    }
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  }
}
