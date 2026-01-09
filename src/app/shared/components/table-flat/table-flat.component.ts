import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
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
export class TableFlatComponent implements OnChanges {
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

  @ViewChild('tableScroll') tableScroll?: ElementRef<HTMLDivElement>;

  CellType = CellType;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns'] || changes['displayedColumns'] || changes['dataSource']) {
      queueMicrotask(() => {
        if (this.tableScroll?.nativeElement) {
          this.tableScroll.nativeElement.scrollLeft = 0;
        }
      });
    }
  }

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

  getBadgeState(value: unknown): 'true' | 'false' | 'null' {
    if (value === null || value === undefined || value === '') {
      return 'null';
    }

    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }

    if (typeof value === 'number') {
      return value === 1 ? 'true' : 'false';
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1') {
        return 'true';
      }
      if (normalized === 'false' || normalized === '0') {
        return 'false';
      }
    }

    return value ? 'true' : 'false';
  }

  getBadgeLabel(value: unknown, column: AutomTableColumn): string {
    const state = this.getBadgeState(value);
    if (state === 'true') {
      return column.badgeLabels?.trueLabel ?? 'Da';
    }
    if (state === 'false') {
      return column.badgeLabels?.falseLabel ?? 'Ne';
    }
    return column.badgeLabels?.nullLabel ?? '-';
  }
}
