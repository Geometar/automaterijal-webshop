import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { finalize, takeWhile } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Automaterijal imports
import { ButtonComponent } from '../../shared/components/button/button.component';
import { FirstLoginPopupComponent } from './first-login-popup/first-login-popup.component';
import { InputFieldsComponent } from '../../shared/components/input-fields/input-fields.component';

// Data models
import {
  Account,
  CreateAccount,
  Credentials,
} from '../../shared/data-models/model';

// Enums
import {
  ButtonThemes,
  ButtonTypes,
  InputTypeEnum,
  SaveButtonIcons,
  SizeEnum,
} from '../../shared/data-models/enums';

// Constants
import { EMAIL_ADDRESS } from '../../shared/data-models/constants/input.constants';

// Services
import { AccountService } from '../../shared/auth/service/account.service';
import { EmailService } from '../../shared/service/email.service';
import { LoginService } from '../../shared/service/login.service';
import { SeoService } from '../../shared/service/seo.service';
import { SnackbarService } from '../../shared/service/utils/snackbar.service';

// Animation
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ButtonComponent,
    CommonModule,
    FirstLoginPopupComponent,
    FormsModule,
    InputFieldsComponent,
    ReactiveFormsModule,
  ],
  animations: [
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate(
          '800ms ease-out',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '0ms ease-in',
          style({ opacity: 0, transform: 'translateY(-10px)' })
        ),
      ]),
    ]),
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class LoginComponent implements OnDestroy, OnInit {
  authenticationToken = '';
  user?: Account;

  // Forms
  loginForm: UntypedFormGroup;
  accountCreationForm: UntypedFormGroup;
  forgotPasswordForm: UntypedFormGroup;

  // Enums
  buttonIcon = SaveButtonIcons.LOADING;
  buttonTheme = ButtonThemes;
  buttonTypes = ButtonTypes;
  inputTypeEnums = InputTypeEnum;
  sizeEnum = SizeEnum;

  // Misc
  createAccountInProgress = false;
  disableLoginBtn = false;
  loginError = false;
  loginInProgress = false;
  showAccountCreation = false;
  showFirstLoginPopup = false;
  showForgotPassword = false;
  showLogin = true;

  private alive = true;

  // Validator patterns
  emailAddressPattern = EMAIL_ADDRESS;

  constructor(
    private accountService: AccountService,
    private emailService: EmailService,
    private fb: UntypedFormBuilder,
    private loginService: LoginService,
    private router: Router,
    private seoService: SeoService,
    private snackbarService: SnackbarService,
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
    this.accountCreationForm = this.fb.group({
      nazivFirme: ['', [Validators.required]],
      pib: ['', [Validators.required]],
      grad: ['', [Validators.required]],
      adresa: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      kontaktTelefon: ['', [Validators.required]],
    });
    this.forgotPasswordForm = this.fb.group({
      id: ['', [Validators.required]],
    });
  }

  /** Angular lifecycle hooks start */

  ngOnInit(): void {
    this.updateSeoTags();
  }

  ngOnDestroy(): void {
    this.alive = false;
  }

  /** Angular lifecycle hooks end */

  /** Main event: start */

  logout(): void {
    this.authenticationToken = '';
    this.loginService.logout();
  }

  login(): void {
    const credentials = {
      username: this.loginForm.controls['username'].value,
      password: this.loginForm.controls['password'].value,
    } as Credentials;
    this.loginService
      .login(credentials)
      .pipe(takeWhile(() => this.alive))
      .subscribe({
        next: (account: Account | null) => {
          this.user = account!;
          this.accountService.authenticate(account);
          this.getToken();
          if (account && account.loginCount === 0) {
            this.showFirstLoginPopup = true;
            return;
          }
          this.routeToPage();
        },
        error: (err: HttpErrorResponse) => {
          if (err.status === 400) {
            this.loginError = true;
          }
        },
      });
  }

  /** Main event: end */

  setSelectionValue(control: string, value: string): void {
    this.loginError = false;
    this.loginForm.controls[control].setValue(value);
  }

  setSelectionValueAccountCreation(control: string, value: string): void {
    this.accountCreationForm.controls[control].setValue(value);
  }

  setSelectionValueForgotPassowrd(control: string, value: string): void {
    this.forgotPasswordForm.controls[control].setValue(value);
  }

  routeToPage(): void {
    this.router.navigateByUrl('/home');
  }

  getToken(): void {
    this.authenticationToken = this.loginService.getToken();
  }

  kreirajNalog(): void {
    this.createAccountInProgress = true;
    const createAccount = this.mapAccountCreationFormToModel();
    this.emailService
      .createAccountRequest(createAccount)
      .pipe(
        takeWhile(() => this.alive),
        finalize(() => (this.createAccountInProgress = false))
      )
      .subscribe({
        next: () => {
          this.snackbarService.showAutoClose(
            'Vaš zahtev za kreiranje naloga je uspešno poslat i uskoro će biti obrađen.'
          );
          this.toggleLogin();
        },
        error: (err: HttpErrorResponse) => { },
      });
  }

  toggleAccountCreation(): void {
    this.showAccountCreation = true;
    this.showForgotPassword = false;
    this.showLogin = false;
  }

  toggleLogin(): void {
    this.showAccountCreation = false;
    this.showForgotPassword = false;
    this.showLogin = true;
  }

  toggleZaboravljenaSifra(): void {
    this.showAccountCreation = false;
    this.showForgotPassword = true;
    this.showLogin = false;
  }

  private mapAccountCreationFormToModel(): CreateAccount {
    const formValue = this.accountCreationForm.value;

    const account: CreateAccount = {
      adresa: formValue.adresa,
      daLiJePravnoLice: true,
      email: formValue.email,
      grad: formValue.grad,
      kontaktTelefon: formValue.kontaktTelefon,
      nazivFirme: formValue.nazivFirme,
      pib: formValue.pib,
    };

    return account;
  }

  changedPasswordPopupHandler(): void {
    this.showFirstLoginPopup = false;
    this.routeToPage();
  }

  private updateSeoTags(): void {
    const url = 'https://automaterijal.com/login';

    this.seoService.updateSeoTags({
      title: 'Prijava | Automaterijal',
      description: 'Ulogujte se na svoj nalog na Automaterijal webshopu.',
      url,
      canonical: url,
      image: 'https://automaterijal.com/images/logo/logo.svg',
      robots: 'noindex, nofollow',
      siteName: 'Automaterijal',
      locale: 'sr_RS',
      type: 'website'
    });

  }
}
