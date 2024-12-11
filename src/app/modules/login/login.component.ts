import { Component, ViewEncapsulation } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Automaterijal imports
import { InputFieldsComponent } from '../../shared/components/input-fields/input-fields.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

// Enums
import { ButtonThemes, ButtonTypes, InputTypeEnum, SaveButtonIcons, SizeEnum } from '../../shared/data-models/enums';

// Constants
import { EMAIL_ADDRESS } from '../../shared/data-models/constants/input.constants';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    FormsModule,
    InputFieldsComponent,
    ReactiveFormsModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class LoginComponent {

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
  disableLoginBtn = false;
  loginInProgress = false;
  showAccountCreation = false;
  showForgotPassword = false;
  showLogin = true;

  // Validator patterns
  emailAddressPattern = EMAIL_ADDRESS;

  constructor(private fb: UntypedFormBuilder) {
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
      kontaktTelefon: ['', [Validators.required]]
    });
    this.forgotPasswordForm = this.fb.group({
      id: ['', [Validators.required]]
    })
  }

  setSelectionValue(control: string, value: string): void {
    this.loginForm.controls[control].setValue(value);
  }

  setSelectionValueAccountCreation(control: string, value: string): void {
    this.accountCreationForm.controls[control].setValue(value);
  }

  setSelectionValueForgotPassowrd(control: string, value: string): void {
    this.forgotPasswordForm.controls[control].setValue(value);
  }

  login(): void {
    console.log('Korisnik je pokusao da se uloguje')!
  }
  kreirajNalog(): void {
    console.log('Korisnik je pokusao da se kreira nalog')!
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
}
