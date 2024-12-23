import { Component, OnDestroy } from '@angular/core';
import { InputFieldsComponent } from '../../shared/components/input-fields/input-fields.component';
import {
  ButtonThemes,
  ButtonTypes,
  ColorEnum,
  IconsEnum,
  SizeEnum,
} from '../../shared/data-models/enums';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { CommonModule } from '@angular/common';
import { AutomIconComponent } from '../../shared/components/autom-icon/autom-icon.component';
import { Subject, takeUntil } from 'rxjs';
import { RobaService } from '../../shared/service/roba.service';
import { Filter, RobaPage } from '../../shared/data-models/model/roba';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-webshop',
  standalone: true,
  imports: [
    InputFieldsComponent,
    ButtonComponent,
    CommonModule,
    AutomIconComponent,
  ],
  templateUrl: './webshop.component.html',
  styleUrl: './webshop.component.scss',
})
export class WebshopComponent implements OnDestroy {
  // Enums
  sizeEnum = SizeEnum;
  iconEnum = IconsEnum;
  colorEnum = ColorEnum;
  buttonTheme = ButtonThemes;
  buttonType = ButtonTypes;

  private destroy$ = new Subject<void>();


  // Paging and Sorting elements
  rowsPerPage = 10;
  pageIndex = 0;
  sort = null;
  filter: Filter = new Filter();
  searchTerm: string = '';


  constructor(private robaService: RobaService) { }


  /** Angular lifecycle hooks start */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  /** Angular lifecycle hooks end */

  /** Event start */

  getRoba(): void {
    this.robaService.pronadjiSvuRobu(
      this.sort, this.rowsPerPage, this.pageIndex, this.searchTerm, this.filter
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (robaPaged: RobaPage) => {
          console.log(robaPaged);
        },
        error: (err: HttpErrorResponse) => {
          const error = err.error.details || err.error;
        }
      });
  }
  /** Event end */
}
