import { Component } from '@angular/core';
import { HeaderComponent } from "./header/header.component";
import { BlogComponent } from './blog/blog.component';
import { BrendoviComponent } from './brendovi/brendovi.component';

@Component({
  selector: 'autom-home',
  standalone: true,
  imports: [HeaderComponent, BlogComponent, BrendoviComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

}
