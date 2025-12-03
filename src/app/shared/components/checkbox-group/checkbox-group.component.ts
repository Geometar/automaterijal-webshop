import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  EventEmitter,
  Input,
  Output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

// Automaterijal imports
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AutomLabelComponent } from '../autom-label/autom-label.component';
import { AutomIconComponent } from '../autom-icon/autom-icon.component';

// Enums
import { IconsEnum } from '../../data-models/enums';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface Task {
  completed: boolean;
  expanded: boolean;
  id: number | string;
  name: string;
  subtasks?: Task[];
}

@Component({
  selector: 'checkbox-group',
  standalone: true,
  imports: [
    AutomIconComponent,
    AutomLabelComponent,
    CommonModule,
    FormsModule,
    MatCheckboxModule,
    MatTooltipModule
  ],
  templateUrl: './checkbox-group.component.html',
  styleUrl: './checkbox-group.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CheckboxGroupComponent {
  @Input() items: Task[] = [];
  @Input() label = '';
  @Input() scrollThreshold = 7;
  @Input() scrollBodyMaxHeight = 220;
  @Input() pinActiveGroups = true;
  @Input() rememberExpansion = true;
  @Output() clickEvent = new EventEmitter<Task[]>();

  // Enums
  iconsEnum = IconsEnum;

  readonly tasks = signal<Task[]>([]); // Signal for internal task management
  readonly maxChipDisplay = 8;
  readonly selectedChips = computed(() => {
    return this.collectSelectedEntries(this.tasks()).slice(0, this.maxChipDisplay);
  });
  readonly chipOverflow = computed(() => {
    const count = this.collectSelectedEntries(this.tasks()).length;
    return Math.max(count - this.maxChipDisplay, 0);
  });

  ngOnChanges() {
    const currentExpandedMap = new Map(this.tasks().map((task) => [task.id, task.expanded]));

    const next = this.items.map((item) => ({
      ...item,
      expanded: this.resolveInitialExpand(item, currentExpandedMap),
    }));

    this.tasks.set(this.sortTasks(next));
  }

  readonly partiallyComplete = computed(() => {
    return this.tasks().map(
      (task) =>
        task.subtasks?.some((t) => t.completed) &&
        !task.subtasks.every((t) => t.completed)
    );
  });

  update(completed: boolean, taskIndex: number, subtaskIndex?: number): void {
    this.tasks.update((tasks) => {
      const draft = [...tasks];
      const task = draft[taskIndex];
      if (subtaskIndex === undefined) {
        task.completed = completed;
        task.subtasks?.forEach((t) => (t.completed = completed));
      } else {
        task.subtasks![subtaskIndex].completed = completed;
        task.completed = task.subtasks?.every((t) => t.completed) ?? true;
      }

      const sorted = this.sortTasks(draft);
      this.clickEvent.emit(sorted);
      return sorted;
    });
  }

  toggleExpand(taskIndex: number): void {
    this.tasks.update((tasks) => {
      const draft = [...tasks];
      draft[taskIndex] = {
        ...draft[taskIndex],
        expanded: !draft[taskIndex].expanded,
      };
      this.persistExpansion(draft);
      return draft;
    });
  }

  // Koliko je čekirano u datoj grupi
  countSelected(task: Task): number {
    return task.subtasks?.filter(s => s.completed).length ?? 0;
  }

  // Ukupan broj podstavki u grupi
  countTotal(task: Task): number {
    return task.subtasks?.length ?? 0;
  }

  hasActiveChildren(task: Task): boolean {
    return this.countSelected(task) > 0;
  }

  shouldScroll(task: Task): boolean {
    return (task.subtasks?.length ?? 0) > this.scrollThreshold;
  }

  clearChip(taskId: Task['id'], subId: Task['id']): void {
    const tasks = this.tasks();
    const groupIndex = tasks.findIndex((t) => t.id === taskId);
    if (groupIndex === -1) { return; }

    const subIndex = tasks[groupIndex].subtasks?.findIndex((s) => s.id === subId) ?? -1;
    if (subIndex === -1) { return; }

    this.update(false, groupIndex, subIndex);
  }

  clearAll(): void {
    const cleared = this.tasks().map((task) => ({
      ...task,
      completed: false,
      subtasks: task.subtasks?.map((sub) => ({ ...sub, completed: false })),
    }));

    const sorted = this.sortTasks(cleared);
    this.tasks.set(sorted);
    this.clickEvent.emit(sorted);
  }

  private sortTasks(tasks: Task[]): Task[] {
    if (!this.pinActiveGroups) {
      return tasks;
    }

    const active: Task[] = [];
    const inactive: Task[] = [];

    tasks.forEach((task) => {
      (task.subtasks?.some((s) => s.completed) ? active : inactive).push(task);
    });

    return [...active, ...inactive];
  }

  private collectSelectedEntries(tasks: Task[]): Array<{ taskId: Task['id']; subId: Task['id']; label: string }> {
    const entries: Array<{ taskId: Task['id']; subId: Task['id']; label: string }> = [];

    tasks.forEach((task) => {
      task.subtasks?.forEach((sub) => {
        if (sub.completed) {
          entries.push({ taskId: task.id, subId: sub.id, label: sub.name });
        }
      });
    });

    return entries;
  }

  badgeAria(task: Task): string {
    const selected = this.countSelected(task);
    const total = this.countTotal(task);
    return `Izabrano ${selected} od ${total}`;
  }

  private resolveInitialExpand(item: Task, currentMap: Map<Task['id'], boolean>): boolean {
    const fromCurrent = currentMap.get(item.id);
    if (fromCurrent !== undefined) {
      return fromCurrent;
    }

    const persisted = this.readPersisted();
    if (persisted.has(item.id)) {
      return persisted.get(item.id) ?? false;
    }

    // Default: open groups; user can collapse and it will be remembered
    return true;
  }

  private persistExpansion(tasks: Task[]): void {
    if (!this.rememberExpansion) {
      return;
    }
    if (typeof sessionStorage === 'undefined') {
      return;
    }
    try {
      const map: Record<string, boolean> = {};
      tasks.forEach((t) => {
        map[String(t.id)] = !!t.expanded;
      });
      sessionStorage.setItem(this.buildStorageKey(), JSON.stringify(map));
    } catch {
      // ignore persistence errors (SSR / private mode)
    }
  }

  private readPersisted(): Map<Task['id'], boolean> {
    if (!this.rememberExpansion) {
      return new Map();
    }
    if (typeof sessionStorage === 'undefined') {
      return new Map();
    }
    try {
      const raw = sessionStorage.getItem(this.buildStorageKey());
      if (!raw) {
        return new Map();
      }
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      return new Map(Object.entries(parsed));
    } catch {
      return new Map();
    }
  }

  private buildStorageKey(): string {
    const safeLabel = this.label?.toLowerCase().replace(/\s+/g, '-').slice(0, 40) || 'checkbox-group';
    return `cb-group-expanded-${safeLabel}`;
  }
}
