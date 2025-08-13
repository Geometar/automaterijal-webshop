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
  @Output() clickEvent = new EventEmitter<Task[]>();

  // Enums
  iconsEnum = IconsEnum;

  readonly tasks = signal<Task[]>([]); // Signal for internal task management

  ngOnChanges() {
    const currentExpandedMap = new Map(this.tasks().map((task) => [task.id, task.expanded]));

    this.tasks.set(
      this.items.map((item) => ({
        ...item,
        expanded: currentExpandedMap.get(item.id) ?? true, // preserve if exists
      }))
    );
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
      const task = tasks[taskIndex];
      if (subtaskIndex === undefined) {
        task.completed = completed;
        task.subtasks?.forEach((t) => (t.completed = completed));
      } else {
        task.subtasks![subtaskIndex].completed = completed;
        task.completed = task.subtasks?.every((t) => t.completed) ?? true;
      }

      // Emit the updated list of subtasks
      this.clickEvent.emit(tasks);
      return [...tasks];
    });
  }

  toggleExpand(taskIndex: number): void {
    this.tasks.update((tasks) => {
      tasks[taskIndex].expanded = !tasks[taskIndex].expanded;
      return [...tasks];
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
}
