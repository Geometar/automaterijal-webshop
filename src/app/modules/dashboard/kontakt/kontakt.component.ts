import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { catchError, finalize, Subject, takeUntil, throwError } from 'rxjs';

// Automaterijal import
import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputFieldsComponent } from '../../../shared/components/input-fields/input-fields.component';
import { TextAreaComponent } from '../../../shared/components/text-area/text-area.component';

// Enums
import {
  ButtonThemes,
  ColorEnum,
  IconsEnum,
  InputTypeEnum,
} from '../../../shared/data-models/enums';

// Constants
import { EMAIL_ADDRESS } from '../../../shared/data-models/constants/input.constants';

// Model
import { Kontakt } from '../../../shared/data-models/model';

// Service
import { EmailService } from '../../../shared/service/email.service';
import { SeoService } from '../../../shared/service/seo.service';

@Component({
  selector: 'app-kontakt',
  standalone: true,
  imports: [
    AutomIconComponent,
    ButtonComponent,
    FormsModule,
    InputFieldsComponent,
    ReactiveFormsModule,
    TextAreaComponent,
  ],
  templateUrl: './kontakt.component.html',
  styleUrl: './kontakt.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class KontaktComponent implements OnDestroy, OnInit {
  colorEnum = ColorEnum;
  iconEnum = IconsEnum;
  inputType = InputTypeEnum;

  // Misc
  porukaJePoslata = false;
  ucitavanje = false;

  // Enums
  buttonThemes = ButtonThemes;

  kontaktForma: UntypedFormGroup;

  // Validator patterns
  emailAddressPattern = EMAIL_ADDRESS;

  private destroy$ = new Subject<void>();

  constructor(
    private emailService: EmailService,
    private fb: UntypedFormBuilder,
    private seoService: SeoService
  ) {
    this.kontaktForma = this.fb.group({
      ime: ['', Validators.required],
      prezime: ['', Validators.required],
      firma: [''],
      tel: [''],
      email: ['', [Validators.required, Validators.email]],
      poruka: ['', Validators.required],
    });
  }

  /** Angular lifecycle hooks start */
  ngOnInit(): void {
    this.updateSeoTags();
  }

  ngOnDestroy(): void {
    this.seoService.clearJsonLd('seo-jsonld-kontakt');

    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Angular lifecycle hooks end */

  setSelectionValue(controlName: any, value: any) {
    this.kontaktForma.controls[controlName].setValue(value);
  }

  posaljiPoruku(): void {
    this.ucitavanje = true;

    this.emailService
      .posaljiPoruku(this.napraviPoruku())
      .pipe(
        takeUntil(this.destroy$),
        catchError((error: Response) => throwError(error)),
        finalize(() => (this.ucitavanje = false))
      )
      .subscribe((res) => { });
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

  private updateSeoTags(): void {
    const url = 'https://www.automaterijal.com/kontakt';

    this.seoService.updateSeoTags({
      title: 'Kontakt | Automaterijal – Auto delovi Šabac',
      description: 'Kontaktirajte Automaterijal u Šapcu – adresa, telefon, email i forma za upit. Tu smo za sva pitanja u vezi sa delovima, filterima i mazivima.',
      url,
      canonical: url,
      robots: 'index, follow',
      siteName: 'Automaterijal',
      locale: 'sr_RS',
      image: 'https://www.automaterijal.com/images/logo/logo.svg',
      imageAlt: 'Automaterijal logo',
      type: 'website'
    });

    // JSON-LD: ContactPage + LocalBusiness (obogaćen geo + radno vreme)
    this.seoService.setJsonLd({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "ContactPage",
          "name": "Kontakt – Automaterijal",
          "url": url
        },
        {
          "@type": "LocalBusiness",
          "name": "Automaterijal d.o.o.",
          "url": "https://www.automaterijal.com/",
          "logo": "https://www.automaterijal.com/images/logo/logo.svg",
          "email": "office@automaterijal.com",
          "telephone": "+38115319000",
          "address": {
            "@type": "PostalAddress",
            "streetAddress": "Kralja Milutina 159",
            "addressLocality": "Šabac",
            "postalCode": "15000",
            "addressCountry": "RS"
          },
          "geo": {
            "@type": "GeoCoordinates",
            "latitude": 44.752038,
            "longitude": 19.689025
          },
          "sameAs": [
            "https://www.facebook.com/automaterijal",
            "https://www.instagram.com/automaterijal"
          ],
          "openingHoursSpecification": [
            { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "08:00", "closes": "17:00" },
            { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "08:00", "closes": "14:00" }
          ]
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Početna", "item": "https://www.automaterijal.com/" },
            { "@type": "ListItem", "position": 2, "name": "Kontakt", "item": url }
          ]
        }
      ]
    }, 'seo-jsonld-kontakt');
  }
}
