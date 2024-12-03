import { Component, Input, OnInit } from '@angular/core';
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';

// Enums
import { ColorEnum, IconsEnum, InputTypeEnum } from '../../../shared/data-models/enums';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-kontakt',
  standalone: true,
  imports: [AutomIconComponent, InputFieldsComponent,
    FormsModule,
    ReactiveFormsModule],
  templateUrl: './kontakt.component.html',
  styleUrl: './kontakt.component.scss'
})
export class KontaktComponent {
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  inputType = InputTypeEnum;

  kontaktForma: UntypedFormGroup;

  constructor(
    private fb: UntypedFormBuilder) {
    this.kontaktForma = this.fb.group({
      ime: [Validators.required],
      prezime: [Validators.required],
    });
  }
}
