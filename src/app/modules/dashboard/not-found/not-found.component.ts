// page-not-found.component.ts
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

// Automaterd imports
import { ButtonComponent } from '../../../shared/components/button/button.component';

// Enums
import { ButtonThemes, ButtonTypes } from '../../../shared/data-models/enums';

@Component({
  selector: 'not-found',
  templateUrl: './not-found.component.html',
  imports: [CommonModule, ButtonComponent],
  styleUrls: ['./not-found.component.scss'],
  standalone: true
})
export class PageNotFoundComponent {
  searchQuery: string = '';

  //Enums
  buttonThemes = ButtonThemes;
  buttonTypes = ButtonTypes;

  constructor(private router: Router) { }

  home(): void {
    this.router.navigate(['/home']);
  }
}