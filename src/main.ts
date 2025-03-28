import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { registerLocaleData } from '@angular/common';
import localeSrLatn from '@angular/common/locales/sr-Latn';
import localeSrLatnExtra from '@angular/common/locales/extra/sr-Latn';

// ✅ Register the locale with extra data
registerLocaleData(localeSrLatn, 'sr-Latn', localeSrLatnExtra);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));