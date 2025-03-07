import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { trigger, style, animate, transition } from '@angular/animations';

// Component imported
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CommonModule } from '@angular/common';
import { InputFieldsComponent } from '../../../../shared/components/input-fields/input-fields.component';

// Data Models
import { AssemblyGroup } from '../../../../shared/data-models/model/tecdoc';

// Enums
import { ColorEnum, IconsEnum, InputTypeEnum } from '../../../../shared/data-models/enums';
import { AutomIconComponent } from '../../../../shared/components/autom-icon/autom-icon.component';
import { UrlHelperService } from '../../../../shared/service/utils/url-helper.service';

@Component({
  selector: 'assembly-groups',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputFieldsComponent, AutomIconComponent],
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
  @Output() event = new EventEmitter<AssemblyGroup>()

  // Enums
  iconEnum = IconsEnum;
  inputType = InputTypeEnum;
  colorEnum = ColorEnum;

  structuredGroups: AssemblyGroup[] = [];
  expandedNodes: Set<number> = new Set();
  expandedCards: Set<number> = new Set();

  // View mode
  showLayerView = true;
  showListView = false;

  constructor(private urlHelperService: UrlHelperService) { }

  // Start of: Angular lifecycle

  ngOnInit() {
    this.structuredGroups = this.buildHierarchy(this.assemblyGroups);
    if (this.urlHelperService.hasQueryParam('listView')) {
      this.showListViewHandler();
    }
  }

  // End of: Angular lifecycle

  showLayerViewHandler(): void {
    this.showLayerView = true;
    this.showListView = false;
    this.urlHelperService.removeQueryParam('listView');
  }

  showListViewHandler(): void {
    this.showListView = true;
    this.showLayerView = false;
    this.urlHelperService.addOrUpdateQueryParams({ listView: true })
  }

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

  filterStructuredGroups(searchTerm: string): void {
    if (!searchTerm) {
      // Reset: Collapse everything if there was a previous filter
      this.expandedNodes.clear();
      this.structuredGroups = this.buildHierarchy(this.assemblyGroups);
      return;
    }

    const matchesSearch = (group: AssemblyGroup): boolean => {
      return group.assemblyGroupName!.toLowerCase().includes(searchTerm.toLowerCase());
    };

    const filterGroups = (groups: AssemblyGroup[]): AssemblyGroup[] => {
      return groups
        .map(group => {
          const filteredChildren = filterGroups(group.childrenNodes!);
          if (matchesSearch(group) || filteredChildren.length > 0) {
            this.expandedNodes.add(group.assemblyGroupNodeId!); // Expand on match
            return { ...group, childrenNodes: filteredChildren };
          }
          return null;
        })
        .filter(group => group !== null) as AssemblyGroup[];
    };

    this.structuredGroups = filterGroups(this.buildHierarchy(this.assemblyGroups));
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

  toggleList(assemblyGroupId: number) {
    if (this.expandedNodes.has(assemblyGroupId)) {
      this.expandedNodes.delete(assemblyGroupId);
    } else {
      this.expandedNodes.add(assemblyGroupId);
    }
  }

  isListExpanded(cardId: number): boolean {
    return this.expandedNodes.has(cardId);
  }

  isExpanded(cardId: number): boolean {
    return this.expandedCards.has(cardId);
  }

  searchForArticlesWithAssembleGroup(data: AssemblyGroup): void {
    this.event.emit(data);
  }
}
