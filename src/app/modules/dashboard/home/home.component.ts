import { Component } from '@angular/core';

// Sub components
import { HeaderComponent } from "./header/header.component";
import { BlogComponent } from './blog/blog.component';
import { BrendoviComponent } from './brendovi/brendovi.component';
import { ONamaSmallComponent } from './o-nama-small/o-nama-small.component';
import { TimoviComponent } from './timovi/timovi.component';

@Component({
  selector: 'autom-home',
  standalone: true,
  imports: [HeaderComponent, BlogComponent, BrendoviComponent, ONamaSmallComponent, TimoviComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

}
