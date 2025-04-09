import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';

// Automaterijal imports
import { CheckboxGroupComponent, Task } from '../../../../shared/components/checkbox-group/checkbox-group.component';


@Component({
  selector: 'category-filter',
  standalone: true,
  imports: [CommonModule, CheckboxGroupComponent],
  templateUrl: './category-filter.component.html',
  styleUrl: './category-filter.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class CategoryFilterComponent implements OnChanges {
  @Input() categories: any = null;
  @Input() selectedSubgroupIds: string[] = [];

  @Output() subgroupsChanged = new EventEmitter<string[]>();

  tasks: Task[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categories'] || changes['selectedSubgroupIds']) {
      this.buildTasks();
    }
  }

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
  }

  emitSelectedSubgroups(updatedTasks: Task[]): void {
    const selectedIds = updatedTasks
      .flatMap(task => task.subtasks || [])
      .filter(sub => sub.completed)
      .map(sub => sub.id.toString());

    this.subgroupsChanged.emit(selectedIds);
  }
}
