import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CommonModule } from '@angular/common';

// Automaterijal imports
import { SpinnerComponent } from '../spinner/spinner.component';

// Enums
import { AutomTableColumn, CellType } from '../../data-models/enums/table.enum';

// Pipes
import { RsdCurrencyPipe } from '../../pipe/rsd-currency.pipe';

@Component({
  selector: 'autom-table-flat',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, SpinnerComponent, RsdCurrencyPipe],
  templateUrl: './table-flat.component.html',
  styleUrl: './table-flat.component.scss'
})
export class TableFlatComponent {
  @Input() columns: AutomTableColumn[] = [];
  @Input() displayedColumns: string[] = [];
  @Input() dataSource!: MatTableDataSource<any>;
  @Input() loading = false;
  @Input() pagination!: {
    length: number;
    pageIndex: number;
    pageSize: number;
    pageSizeOptions: number[];
  };

  @Output() pageChange: EventEmitter<PageEvent> = new EventEmitter<PageEvent>();
  @Output() rowClick = new EventEmitter<any>();

  CellType = CellType;

  isMobileView(): boolean {
    return window.innerWidth < 768;
  }

  getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  onLinkClick(row: any, callback?: (row: any) => void): void {
    callback?.(row);
    this.rowClick.emit(row);
  }

  onPageChange(event: PageEvent): void {
    this.pageChange.emit(event);
  }
}
