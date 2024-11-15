import { Component } from '@angular/core';

@Component({
  selector: 'o-nama-home',
  standalone: true,
  imports: [],
  templateUrl: './o-nama-small.component.html',
  styleUrl: './o-nama-small.component.scss'
})
export class ONamaSmallComponent {
  yearCompanyIsCreated = new Date().getFullYear() - 1990;
}
