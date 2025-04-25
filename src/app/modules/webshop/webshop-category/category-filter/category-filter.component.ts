import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, EventEmitter, HostListener, Inject, Input, OnChanges, OnInit, Output, PLATFORM_ID, SimpleChanges, ViewEncapsulation } from '@angular/core';

// Automaterijal imports
import { CheckboxGroupComponent, Task } from '../../../../shared/components/checkbox-group/checkbox-group.component';
import { SelectComponent } from '../../../../shared/components/select/select.component';
import { SelectModel } from '../../../../shared/data-models/interface';


@Component({
  selector: 'category-filter',
  standalone: true,
  imports: [CommonModule, CheckboxGroupComponent, SelectComponent],
  templateUrl: './category-filter.component.html',
  styleUrl: './category-filter.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CategoryFilterComponent implements OnChanges, OnInit {
  @Input() categories: any = null;
  @Input() selectedSubgroupIds: string[] = [];

  @Output() subgroupsChanged = new EventEmitter<string[]>();

  // Misc
  isMobile = false;
  selectReady = false;

  // Select elements
  selectOptions: SelectModel[] = [];
  selectedOption: SelectModel | null = null;

  tasks: Task[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private cdr: ChangeDetectorRef) { }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.isMobile = isPlatformBrowser(this.platformId) && window.innerWidth < 991;
  }

  /** Start of: Angular lifecycle hooks */

  ngOnInit() {
    this.isMobile = isPlatformBrowser(this.platformId) && window.innerWidth < 991;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categories'] || changes['selectedSubgroupIds']) {
      this.buildTasks();
    }
  }

  /** End of: Angular lifecycle hooks */

  buildTasks(): void {
    if (!this.categories) return;

    this.tasks = Object.keys(this.categories).map((key) => {
      const subtasks = this.categories[key].map((item: any) => ({
        name: item.naziv,
        completed: this.selectedSubgroupIds.includes(item.id.toString()),
        id: item.id,
        grupa: item.grupa,
      }));

      const allCompleted = subtasks.length > 0 && subtasks.every((t: Task) => t.completed);

      return {
        name: key,
        completed: allCompleted,
        id: key,
        subtasks,
        expanded: true
      };
    });

    this.selectOptions = this.tasks.flatMap(task =>
      task.subtasks!.map(sub => ({
        key: sub.id.toString(),
        value: sub.name
      }))
    );

    // Optionally: auto-select the first value
    if (this.selectedSubgroupIds?.length) {
      const match = this.selectOptions.find(opt =>
        this.selectedSubgroupIds.includes(opt.key!.toString())
      );
      this.selectedOption = match ?? null;
    }

    // ✅ Trigger outside change detection cycle
    setTimeout(() => {
      this.selectReady = true;
      this.cdr.detectChanges(); // <--- ovo garantuje da Angular ne baci NG0100
    });
  }

  emitSelectedSubgroups(updatedTasks: Task[]): void {
    const selectedIds = updatedTasks
      .flatMap(task => task.subtasks || [])
      .filter(sub => sub.completed)
      .map(sub => sub.id.toString());

    this.subgroupsChanged.emit(selectedIds);
  }

  onSelectChange(selected: SelectModel): void {
    this.selectedOption = selected;
    !!selected.key ? this.subgroupsChanged.emit([selected.key]) : this.subgroupsChanged.emit([]);
  }

  isMobileView(): boolean {
    return this.isMobile;
  }
}
