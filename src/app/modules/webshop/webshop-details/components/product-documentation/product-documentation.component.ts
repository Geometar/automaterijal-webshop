import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AutomIconComponent } from '../../../../../shared/components/autom-icon/autom-icon.component';
import { TooltipModel } from '../../../../../shared/data-models/interface';
import { IconsEnum } from '../../../../../shared/data-models/enums/icons.enum';
import { TecDocDokumentacija } from '../../../../../shared/data-models/model/roba';
import { YouTubePlayerModule } from '@angular/youtube-player';

export interface DocumentationGroup {
  title: string;
  documents: TecDocDokumentacija[];
}

@Component({
  selector: 'app-product-documentation',
  standalone: true,
  imports: [CommonModule, AutomIconComponent, YouTubePlayerModule],
  templateUrl: './product-documentation.component.html',
  styleUrls: ['./product-documentation.component.scss'],
})
export class ProductDocumentationComponent {
  @Input() groups: DocumentationGroup[] = [];
  @Input() pdfTooltip!: TooltipModel;
  @Output() openPdf = new EventEmitter<TecDocDokumentacija>();
  @Output() openLink = new EventEmitter<TecDocDokumentacija>();

  iconEnum = IconsEnum;

  trackByTitle(_index: number, item: DocumentationGroup): string {
    return item.title;
  }
}
