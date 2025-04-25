import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { registerLocaleData } from '@angular/common';
import localeSrLatn from '@angular/common/locales/sr-Latn';
import localeSrLatnExtra from '@angular/common/locales/extra/sr-Latn';
import { Router } from '@angular/router';

registerLocaleData(localeSrLatn, 'sr-Latn', localeSrLatnExtra);

// ➡️ Umesto samo bootstrapApplication:
bootstrapApplication(AppComponent, appConfig)
  .then((appRef) => {
    const router = appRef.injector.get(Router);
    router.initialNavigation(); // 👈 Tek sad pokrećeš navigaciju
  })
  .catch((err) => console.error(err));