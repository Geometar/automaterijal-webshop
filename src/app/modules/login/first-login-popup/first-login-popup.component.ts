import {
  Component,
  inject,
  EventEmitter,
  Output,
  ViewEncapsulation,
  Input,
  OnDestroy,
} from '@angular/core';
import { PopupComponent } from '../../../shared/components/popup/popup.component';
import {
  ColorEnum,
  IconsEnum,
  InputTypeEnum,
  PositionEnum,
  SizeEnum,
} from '../../../shared/data-models/enums';
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';

// Temp
import {
  FormBuilder,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  StepperOrientation,
  MatStepperModule,
} from '@angular/material/stepper';
import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';

import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { PartnerService } from '../../../shared/service/partner.service';
import { Account, PasswordChange } from '../../../shared/data-models/model';
import { SnackbarService } from '../../../shared/service/utils/snackbar.service';

export class PasswordRules {
  passwordLength: boolean | null = null;
  passwordsMatching: boolean | null = null;
}

@Component({
  selector: 'first-login-popup',
  standalone: true,
  imports: [
    CommonModule,
    PopupComponent,
    AutomIconComponent,
    MatStepperModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    InputFieldsComponent,
    MatButtonModule,
  ],
  host: { ngSkipHydration: '' },
  templateUrl: './first-login-popup.component.html',
  styleUrl: './first-login-popup.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class FirstLoginPopupComponent implements OnDestroy {
  @Input() account: Account = {} as Account;
  @Output() closePopupModal: EventEmitter<void> = new EventEmitter<void>();

  // Data
  password = '';
  passwordRules: PasswordRules = {} as PasswordRules;
  repeatPassword = '';

  // Enums
  colorEnum = ColorEnum;
  iconsEnum = IconsEnum;
  inputTypeEnum = InputTypeEnum;
  positionEnum = PositionEnum;
  sizeEnum = SizeEnum;

  // Misc
  passwordSaving = false;

  private _formBuilder = inject(FormBuilder);

  formGroup = this._formBuilder.group({
    firstPassword: ['', Validators.required],
    secondPassword: ['', Validators.required],
  });

  stepperOrientation: Observable<StepperOrientation>;

  private destroy$ = new Subject<void>();

  get enablePasswordBtn(): boolean {
    return (
      this.passwordRules.passwordLength === true &&
      this.passwordRules.passwordsMatching === true &&
      !this.passwordSaving
    );
  }

  constructor(
    private partnerService: PartnerService,
    private snackbarService: SnackbarService
  ) {
    const breakpointObserver = inject(BreakpointObserver);

    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 100px)')
      .pipe(map(({ matches }) => (matches ? 'horizontal' : 'vertical')));
  }

  /** Angular lifecycle hooks start */

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Angular lifecycle hooks end */

  evaluatePassword(event: string, isRepeatPassword: boolean): void {
    !isRepeatPassword ? (this.password = event) : (this.repeatPassword = event);

    // Check Length
    const lengthRegex = /^.{5,}$/;
    this.passwordRules.passwordLength = lengthRegex.test(this.password);

    // Passwords Match
    this.passwordRules.passwordsMatching =
      !!this.password &&
      !!this.repeatPassword &&
      this.password === this.repeatPassword;
  }

  createNewPassowrd(): void {
    const passwordChange = new PasswordChange();
    passwordChange.sifra = this.password;
    passwordChange.ponovljenjaSifra = this.repeatPassword;
    passwordChange.ppid = this.account.ppid;

    this.partnerService
      .promeniSifru(passwordChange, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.snackbarService.showAutoClose('Sifra uspesno je uspesno promenjena');
      });
  }
}
