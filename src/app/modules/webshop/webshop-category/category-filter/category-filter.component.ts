import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  PLATFORM_ID,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';

// Automaterijal imports
import { CheckboxGroupComponent, Task } from '../../../../shared/components/checkbox-group/checkbox-group.component';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { SelectModel } from '../../../../shared/data-models/interface';

@Component({
  selector: 'category-filter',
  standalone: true,
  imports: [CommonModule, CheckboxGroupComponent, SelectComponent],
  templateUrl: './category-filter.component.html',
  styleUrls: ['./category-filter.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class CategoryFilterComponent implements OnChanges, OnInit {
  /** Full categories object: { [groupLabel]: Array<{ id, naziv, grupa }> } */
  @Input() categories: any = null;

  /** Selected subGroup ids coming from parent (URL-driven) */
  @Input() selectedSubgroupIds: string[] = [];

  /** Emits normalized list of selected subGroup ids (as strings) */
  @Output() subgroupsChanged = new EventEmitter<string[]>();

  // View mode
  isMobile = false;
  selectReady = false;

  // Models for UI
  tasks: Task[] = [];                       // desktop (checkbox-group)
  selectOptions: SelectModel[] = [];        // mobile (select)
  selectedOption: SelectModel | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) { }

  // Keep mobile breakpoint in sync
  @HostListener('window:resize')
  onResize(): void {
    this.isMobile = isPlatformBrowser(this.platformId) && window.innerWidth < 991;
  }

  /** Lifecycle */
  ngOnInit(): void {
    this.isMobile = isPlatformBrowser(this.platformId) && window.innerWidth < 991;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categories'] || changes['selectedSubgroupIds']) {
      this.buildTasks();
    }
  }

  /** Build flat models for desktop + mobile */
  private buildTasks(): void {
    if (!this.categories) {
      this.tasks = [];
      this.selectOptions = [];
      this.selectedOption = null;
      this.selectReady = false;
      return;
    }

    // Normalize selected ids to strings (URL may provide numbers)
    const selected = new Set((this.selectedSubgroupIds || []).map(String));

    // Sort groups by label (stable UX)
    const groupKeys = Object.keys(this.categories).sort((a, b) =>
      a.localeCompare(b, 'sr', { sensitivity: 'base' })
    );

    // Build checkbox "tasks" (desktop)
    const tasks: Task[] = groupKeys.map((groupKey) => {
      const subs = [...(this.categories[groupKey] || [])]
        .sort((a: any, b: any) => (a?.naziv || '').localeCompare(b?.naziv || '', 'sr', { sensitivity: 'base' }))
        .map((item: any) => ({
          name: item?.naziv ?? '',
          completed: selected.has(String(item?.id)),
          id: item?.id,
          grupa: item?.grupa,     // keep for compatibility
          expanded: false
        }));

      const allCompleted = subs.length > 0 && subs.every((s: Task) => s.completed);

      return {
        completed: allCompleted,
        expanded: false,          // let your CheckboxGroup decide expand UI
        id: groupKey,
        name: groupKey,
        subtasks: subs,
      } as Task;
    });

    this.tasks = tasks;

    // Build select options (mobile) – show "Group • Subgroup" for clarity
    this.selectOptions = tasks.flatMap(t =>
      (t.subtasks || []).map(sub => ({
        key: String(sub.id),
        value: `${t.name} • ${sub.name}`,
      }))
    );

    // Sync mobile selected option to first selected id (if any)
    const firstSelected = this.selectedSubgroupIds?.[0];
    this.selectedOption = firstSelected
      ? this.selectOptions.find(o => o.key === String(firstSelected)) ?? null
      : null;

    // Ready flag (avoid ExpressionChanged) – schedule in microtask
    queueMicrotask(() => {
      this.selectReady = true;
      this.cdr.detectChanges();
    });
  }

  /** Desktop: CheckboxGroup emits full Task[] back – compute all checked subtasks */
  emitSelectedSubgroups(updatedTasks: Task[]): void {
    const selectedIds = (updatedTasks || [])
      .flatMap(t => t?.subtasks || [])
      .filter(sub => !!sub?.completed)
      .map(sub => String(sub?.id));

    // Emit once (microtask) to avoid multiple URL writes when UI toggles many boxes at once
    queueMicrotask(() => this.subgroupsChanged.emit(selectedIds));
  }

  /** Mobile: single select → emit one id (or empty array) */
  onSelectChange(selected: SelectModel): void {
    this.selectedOption = selected;
    const key = selected?.key ? String(selected.key) : null;
    queueMicrotask(() => this.subgroupsChanged.emit(key ? [key] : []));
  }

  /** Template helper for SSR-safe media query */
  isMobileView(): boolean {
    return this.isMobile;
  }
}