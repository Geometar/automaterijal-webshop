import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

export interface OeNumberEntry {
  code: string;
  labels: string[];
}

@Component({
  selector: 'app-product-oe-numbers',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-oe-numbers.component.html',
  styleUrls: ['./product-oe-numbers.component.scss'],
})
export class ProductOeNumbersComponent {
  @Input() entries: OeNumberEntry[] = [];
}
