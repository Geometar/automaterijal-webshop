import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs';

// Data models
import { Brand } from '../../../../shared/data-models/interface';

// Services
import { ConfigService } from '../../../../shared/service/config.service';

@Component({
  selector: 'app-brendovi',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './brendovi.component.html',
  styleUrl: './brendovi.component.scss',
})
export class BrendoviComponent implements OnInit {

  // Data
  brands: Brand[] = [];

  constructor(private configService: ConfigService) { }

  ngOnInit(): void {
    this.configService
      .getConfig()
      .pipe(take(1))
      .subscribe((config) => {
        this.brands = config.brands;
      });
  }
}
