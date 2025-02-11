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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AutomLabelComponent } from '../autom-label/autom-label.component';

export interface Task {
  completed: boolean;
  id: number | string;
  name: string;
  subtasks?: Task[];
}

@Component({
  selector: 'checkbox-group',
  standalone: true,
  imports: [MatCheckboxModule, FormsModule, CommonModule, AutomLabelComponent],
  templateUrl: './checkbox-group.component.html',
  styleUrl: './checkbox-group.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CheckboxGroupComponent {
  @Input() items: Task[] = [];
  @Input() label = '';
  @Output() clickEvent = new EventEmitter<Task[]>();

  readonly tasks = signal<Task[]>([]); // Signal for internal task management

  ngOnChanges() {
    this.tasks.set(this.items); // Set tasks from parent input when it changes
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
}
