import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

// Models
import { Roba } from '../../../shared/data-models/model/roba';

// Enums
import { IconsEnum } from '../../../shared/data-models/enums';

// Components
import { AutomProductCardComponent } from '../../../shared/components/product-card/product-card.component';
import { SpinnerComponent } from '../spinner/spinner.component';
import { RouterModule } from '@angular/router';

export interface ShowcaseSection {
  title: string;
  titleUrl: string;
  artikli: Roba[];
}

@Component({
  selector: 'autom-showcase',
  standalone: true,
  imports: [CommonModule, AutomProductCardComponent, SpinnerComponent, RouterModule],
  templateUrl: './showcase.component.html',
  styleUrls: ['./showcase.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ShowcaseComponent {
  @Input() showcase: ShowcaseSection[] = [];
  @Input() loading = false;

  // Enums
  iconEnum = IconsEnum;
}
