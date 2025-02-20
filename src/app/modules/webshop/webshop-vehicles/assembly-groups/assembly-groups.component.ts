import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';

// Data Models
import { AssemblyGroup } from '../../../../shared/data-models/model/tecdoc';

// Component imported
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'assembly-groups',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './assembly-groups.component.html',
  styleUrl: './assembly-groups.component.scss',
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class AssemblyGroupsComponent implements OnInit {
  @Input() assemblyGroups: AssemblyGroup[] = [];

  structuredGroups: AssemblyGroup[] = [];
  expandedNodes: Set<number> = new Set();
  expandedCards: Set<number> = new Set();

  // Start of: Angular lifecycle

  ngOnInit() {
    this.structuredGroups = this.buildHierarchy(this.assemblyGroups);
  }

  // End of: Angular lifecycle

  buildHierarchy(groups: AssemblyGroup[]): AssemblyGroup[] {
    const parentMap = new Map<number, AssemblyGroup>();
    groups.forEach(group => parentMap.set(group.assemblyGroupNodeId!, { ...group, childrenNodes: [] }));
    const rootGroups: AssemblyGroup[] = [];
    groups.forEach(group => {
      if (group.parentNodeId && parentMap.has(group.parentNodeId)) {
        parentMap.get(group.parentNodeId)!.childrenNodes!.push(parentMap.get(group.assemblyGroupNodeId!)!);
      } else {
        rootGroups.push(parentMap.get(group.assemblyGroupNodeId!)!);
      }
    });
    return rootGroups;
  }

  toggleShowAll(cardId: number) {
    const element = document.getElementById(`group-${cardId}`);
    const content = document.getElementById(`content-${cardId}`);

    if (this.expandedCards.has(cardId)) {
      // Start fading out content immediately
      if (content) {
        content.classList.add('collapsing');
      }

      // Shrink the card after a short delay to sync animations
      if (element) {
        element.classList.add('collapsing');
      }

      setTimeout(() => {
        this.expandedCards.delete(cardId);
        if (element) {
          element.classList.remove('expanded', 'collapsing');
        }
        if (content) {
          content.classList.remove('collapsing');
        }
      }, 100); // Sync with CSS transition time
    } else {
      this.expandedCards.add(cardId);
    }
  }

  isExpanded(cardId: number): boolean {
    return this.expandedCards.has(cardId);
  }
}
