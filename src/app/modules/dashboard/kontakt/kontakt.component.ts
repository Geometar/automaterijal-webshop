import { Component, } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

// Automaterijal import
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { TextAreaComponent } from '../../../shared/components/text-area/text-area.component';

// Enums
import { ColorEnum, IconsEnum, InputTypeEnum } from '../../../shared/data-models/enums';

// Constants
import { EMAIL_ADDRESS } from '../../../shared/data-models/constants/input.constants';

@Component({
  selector: 'app-kontakt',
  standalone: true,
  imports: [
    AutomIconComponent,
    ButtonComponent,
    FormsModule,
    InputFieldsComponent,
    ReactiveFormsModule,
    TextAreaComponent],
  templateUrl: './kontakt.component.html',
  styleUrl: './kontakt.component.scss'
})
export class KontaktComponent {
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  inputType = InputTypeEnum;

  kontaktForma: UntypedFormGroup;

  // Validator patterns
  emailAddressPattern = EMAIL_ADDRESS;

  constructor(
    private fb: UntypedFormBuilder) {
    this.kontaktForma = this.fb.group({
      ime: [Validators.required],
      prezime: [Validators.required],
      firma: [],
      tel: [],
      email: [Validators.required, Validators.email],
      poruka: [Validators.required],
    });
  }

  setSelectionValue(controlName: any, value: any) {
    this.kontaktForma.controls[controlName].setValue(value);
  }
}
