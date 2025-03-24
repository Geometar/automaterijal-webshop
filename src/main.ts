import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { registerLocaleData } from '@angular/common';
import localeSr from '@angular/common/locales/sr';

// Register the locale
registerLocaleData(localeSr, 'sr');

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
