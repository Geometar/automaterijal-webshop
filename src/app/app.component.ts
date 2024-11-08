import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavigationComponent } from './navigation/navigation.component';
import { FooterComponent } from "./footer/footer.component";

@Component({
  selector: 'autom-root',
  standalone: true,
  imports: [NavigationComponent, RouterOutlet, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'automaterijal-web-erp';
}
