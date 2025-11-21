import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewEncapsulation
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Location } from '@angular/common';

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
})
export class AssemblyGroupsComponent implements OnInit, OnChanges {
  @Input() assemblyGroups: AssemblyGroup[] = [];
  @Output() assemblyGroupSelected = new EventEmitter<AssemblyGroup>();

  // Enums
  iconEnum = IconsEnum;
  inputType = InputTypeEnum;
  colorEnum = ColorEnum;

  structuredGroups: AssemblyGroup[] = [];
  expandedNodes: Set<number> = new Set();
  expandedCards: Set<number> = new Set();
  private autoExpandedNodes: Set<number> = new Set();
  private autoExpandedCards: Set<number> = new Set();
  private matchedGroupIds: Set<number> = new Set();
  private highlightCache = new Map<string, SafeHtml>();

  // View mode
  viewMode: 'grid' | 'list' = 'grid';
  searchTerm = '';

  constructor(
    private urlHelperService: UrlHelperService,
    private sanitizer: DomSanitizer,
    private location: Location
  ) { }

  // Start of: Angular lifecycle

  ngOnInit() {
    this.initializeViewMode();
    this.rebuildHierarchy();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['assemblyGroups']) {
      this.rebuildHierarchy();
    }
  }

  // End of: Angular lifecycle

  activateGridView(): void {
    if (this.viewMode === 'grid') {
      return;
    }
    this.viewMode = 'grid';
    this.syncListViewParam(false);
  }

  activateListView(): void {
    if (this.viewMode === 'list') {
      return;
    }
    this.viewMode = 'list';
    this.syncListViewParam(true);
  }

  isGridView(): boolean {
    return this.viewMode === 'grid';
  }

  isListView(): boolean {
    return this.viewMode === 'list';
  }

  buildHierarchy(groups: AssemblyGroup[]): AssemblyGroup[] {
    const parentMap = new Map<number, AssemblyGroup>();

    // Step 1: Initialize the map with empty children
    groups.forEach(group => {
      const clone: AssemblyGroup = {
        ...group,
        childrenNodes: []
      };
      parentMap.set(group.assemblyGroupNodeId!, clone);
    });

    const rootGroups: AssemblyGroup[] = [];

    // Step 2: Build parent-child hierarchy
    groups.forEach(group => {
      const current = parentMap.get(group.assemblyGroupNodeId!)!;
      if (group.parentNodeId && parentMap.has(group.parentNodeId)) {
        const parent = parentMap.get(group.parentNodeId)!;
        parent.childrenNodes!.push(current);
      } else {
        rootGroups.push(current);
      }
    });

    // Step 3: Reorganize – flatten grandchildren under the same parent
    parentMap.forEach(parent => {
      const allChildren = parent.childrenNodes ?? [];

      // Collect all grandchildren who have parentNodeId pointing to one of these children
      const grandChildren: AssemblyGroup[] = [];

      allChildren.forEach(child => {
        const childId = child.assemblyGroupNodeId;
        // Find all grandchildren who point to this child as parent
        const subChildren = groups.filter(g => g.parentNodeId === childId);
        subChildren.forEach(grandchild => {
          const grandChildInstance = parentMap.get(grandchild.assemblyGroupNodeId!);
          if (grandChildInstance && !allChildren.includes(grandChildInstance)) {
            (grandChildInstance as any).originParentId = childId;
            grandChildren.push(grandChildInstance);
          }
        });

        // Clear nested children if they exist
        child.childrenNodes = [];
      });

      // Append grandchildren next to their parent
      // Combine allChildren and grandChildren
      const combined = [...allChildren, ...grandChildren];

      // Sort so that grandchild comes immediately after their originParent
      const sorted: AssemblyGroup[] = [];

      combined.forEach(item => {
        sorted.push(item);

        const itemId = item.assemblyGroupNodeId;

        const grandchildrenForThis = combined.filter(
          g => (g as any).originParentId === itemId
        );

        sorted.push(...grandchildrenForThis);
      });

      // Remove duplicates
      const uniqueSorted = Array.from(new Map(sorted.map(g => [g.assemblyGroupNodeId, g])).values());

      parent.childrenNodes = uniqueSorted;
    });

    return rootGroups;
  }

  filterStructuredGroups(searchTerm: string): void {
    this.applySearchTerm(searchTerm);
  }

  toggleShowAll(cardId: number, event?: MouseEvent): void {
    event?.stopPropagation();
    if (this.expandedCards.has(cardId)) {
      this.expandedCards.delete(cardId);
      return;
    }
    this.expandedCards.add(cardId);
  }

  toggleList(assemblyGroupId: number): void {
    if (this.expandedNodes.has(assemblyGroupId)) {
      this.expandedNodes.delete(assemblyGroupId);
      return;
    }
    this.expandedNodes.add(assemblyGroupId);
  }

  isListExpanded(cardId: number): boolean {
    return this.expandedNodes.has(cardId) || (this.searchTerm ? this.autoExpandedNodes.has(cardId) : false);
  }

  isCardExpanded(cardId: number): boolean {
    return this.expandedCards.has(cardId) || (this.searchTerm ? this.autoExpandedCards.has(cardId) : false);
  }

  shouldShowAllChildren(cardId: number | undefined): boolean {
    if (cardId === undefined) {
      return true;
    }
    return this.isCardExpanded(cardId);
  }

  onGroupSelected(group: AssemblyGroup, event?: MouseEvent): void {
    event?.stopPropagation();
    this.assemblyGroupSelected.emit(group);
  }

  trackByGroup = (_: number, group: AssemblyGroup): number =>
    group.assemblyGroupNodeId ?? _; // fallback

  getHighlightedName(group: AssemblyGroup | undefined): SafeHtml {
    if (!group?.assemblyGroupNodeId || !group.assemblyGroupName) {
      return '';
    }

    const baseKey = group.assemblyGroupNodeId.toString();

    if (!this.searchTerm) {
      if (!this.highlightCache.has(baseKey)) {
        this.highlightCache.set(
          baseKey,
          this.sanitizer.bypassSecurityTrustHtml(group.assemblyGroupName)
        );
      }
      return this.highlightCache.get(baseKey)!;
    }

    const cacheKey = `${group.assemblyGroupNodeId}-${this.searchTerm.toLowerCase()}`;
    if (this.highlightCache.has(cacheKey)) {
      return this.highlightCache.get(cacheKey)!;
    }

    const escapedTerm = this.escapeRegExp(this.searchTerm);
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    const highlighted = group.assemblyGroupName.replace(
      regex,
      '<span class="highlight">$1</span>'
    );

    const safe = this.sanitizer.bypassSecurityTrustHtml(highlighted);
    this.highlightCache.set(cacheKey, safe);
    return safe;
  }

  isMatchedGroup(groupId: number | undefined): boolean {
    if (!groupId || !this.searchTerm) {
      return false;
    }
    return this.matchedGroupIds.has(groupId);
  }

  private rebuildHierarchy(): void {
    this.highlightCache.clear();
    this.structuredGroups = this.buildHierarchy(this.assemblyGroups ?? []);
    this.applySearchTerm(this.searchTerm, true);
  }

  private initializeViewMode(): void {
    this.viewMode = this.urlHelperService.hasQueryParam('listView') ? 'list' : 'grid';
  }

  private applySearchTerm(term: string, preserveManualExpansion = false): void {
    const normalizedTerm = (term ?? '').trim();
    this.searchTerm = normalizedTerm;
    this.highlightCache.clear();
    this.matchedGroupIds.clear();
    this.autoExpandedNodes.clear();
    this.autoExpandedCards.clear();

    if (!normalizedTerm) {
      this.structuredGroups = this.buildHierarchy(this.assemblyGroups ?? []);
      this.matchedGroupIds.clear();
      return;
    }

    const lowerTerm = normalizedTerm.toLowerCase();

    const traverse = (group: AssemblyGroup, ancestorIds: number[]): boolean => {
      const groupId = group.assemblyGroupNodeId;
      const name = group.assemblyGroupName ?? '';
      const matches = name.toLowerCase().includes(lowerTerm);

      let descendantMatch = false;
      (group.childrenNodes ?? []).forEach((child) => {
        if (traverse(child, groupId ? [...ancestorIds, groupId] : ancestorIds)) {
          descendantMatch = true;
        }
      });

      if ((matches || descendantMatch) && groupId !== undefined) {
        this.matchedGroupIds.add(groupId);
        this.autoExpandedCards.add(groupId);
        this.autoExpandedNodes.add(groupId);
        ancestorIds.forEach((ancestorId) => {
          this.autoExpandedCards.add(ancestorId);
          this.autoExpandedNodes.add(ancestorId);
        });
        return true;
      }

      return matches || descendantMatch;
    };

    const filteredRoots: AssemblyGroup[] = [];

    this.structuredGroups.forEach((group) => {
      if (traverse(group, [])) {
        filteredRoots.push(group);
      }
    });

    this.structuredGroups = filteredRoots;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private syncListViewParam(enabled: boolean): void {
    const query = { ...this.urlHelperService.readQueryParams() };
    if (enabled) {
      query['listView'] = 'true';
    } else {
      delete query['listView'];
    }

    const path = this.urlHelperService.getCurrentPath();
    const searchParams = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== null && value !== undefined && `${value}`.trim() !== '') {
        searchParams.set(key, `${value}`);
      }
    });
    const queryString = searchParams.toString();
    const newUrl = queryString ? `${path}?${queryString}` : path;
    this.location.replaceState(newUrl);
  }
}
