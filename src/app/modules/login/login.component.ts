import { Component, ViewEncapsulation } from '@angular/core';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { InputFieldsComponent } from '../../shared/components/input-fields/input-fields.component';
import { ButtonThemes, ButtonTypes, InputTypeEnum, SaveButtonIcons, SizeEnum } from '../../shared/data-models/enums';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
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

  // Enums
  buttonIcon = SaveButtonIcons.LOADING;
  buttonTheme = ButtonThemes;
  buttonTypes = ButtonTypes;
  inputTypeEnums = InputTypeEnum;
  sizeEnum = SizeEnum;

  // Misc
  disableLoginBtn = false;
  loginInProgress = false;

  constructor(private fb: UntypedFormBuilder) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  setSelectionValue(control: string, value: string): void {
    this.loginForm.controls[control].setValue(value);
  }

  login(): void {
    console.log('Korisnik je pokusao da se uloguje')!
  }
}
