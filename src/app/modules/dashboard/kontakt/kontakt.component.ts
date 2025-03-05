import { Component, OnDestroy, ViewEncapsulation, } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { catchError, finalize, takeWhile, throwError } from 'rxjs';

// Automaterijal import
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { TextAreaComponent } from '../../../shared/components/text-area/text-area.component';

// Enums
import { ButtonThemes, ColorEnum, IconsEnum, InputTypeEnum } from '../../../shared/data-models/enums';

// Constants
import { EMAIL_ADDRESS } from '../../../shared/data-models/constants/input.constants';

// Model
import { Kontakt } from '../../../shared/data-models/model/kontakt';

// Service
import { EmailService } from '../../../shared/service/email.service';

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
  styleUrl: './kontakt.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class KontaktComponent implements OnDestroy {
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  inputType = InputTypeEnum;

  // Misc
  alive = true;
  porukaJePoslata = false;
  ucitavanje = false;

  // Enums
  buttonThemes = ButtonThemes;

  kontaktForma: UntypedFormGroup;

  // Validator patterns
  emailAddressPattern = EMAIL_ADDRESS;

  constructor(
    private fb: UntypedFormBuilder, private emailService: EmailService) {
    this.kontaktForma = this.fb.group({
      ime: ['', Validators.required],
      prezime: ['', Validators.required],
      firma: [''],
      tel: [''],
      email: ['', [Validators.required, Validators.email]],
      poruka: ['', Validators.required],
    });
  }

  ngOnDestroy(): void {
    this.alive = false;
  }

  setSelectionValue(controlName: any, value: any) {
    this.kontaktForma.controls[controlName].setValue(value);
  }

  posaljiPoruku(): void {
    this.ucitavanje = true;

    this.emailService.posaljiPoruku(this.napraviPoruku())
      .pipe(
        takeWhile(() => this.alive),
        catchError((error: Response) => throwError(error)),
        finalize(() => this.ucitavanje = false)
      ).subscribe(res => {
      });
  }

  private napraviPoruku(): Kontakt {
    return {
      ime: this.kontaktForma.controls['ime'].value,
      prezime: this.kontaktForma.controls['prezime'].value,
      firma: this.kontaktForma.controls['firma'].value,
      tel: this.kontaktForma.controls['tel'].value,
      email: this.kontaktForma.controls['email'].value,
      poruka: this.kontaktForma.controls['poruka'].value,
    } as Kontakt;
  }
}
