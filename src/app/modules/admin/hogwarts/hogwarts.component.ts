import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { finalize } from 'rxjs';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AutomIconComponent } from '../../../shared/components/autom-icon/autom-icon.component';
import { IconsEnum } from '../../../shared/data-models/enums';
import {
  FebiPriceAdminService,
  PriceReloadResponse,
  PriceFileInfoResponse,
} from '../../../shared/service/febi-price-admin.service';
import { SnackbarService } from '../../../shared/service/utils/snackbar.service';

@Component({
  selector: 'app-hogwarts',
  standalone: true,
  imports: [CommonModule, AutomIconComponent, MatSnackBarModule],
  templateUrl: './hogwarts.component.html',
  styleUrl: './hogwarts.component.scss',
  encapsulation: ViewEncapsulation.None,
})
export class HogwartsComponent {
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  icons = IconsEnum;
  uploadFile: File | null = null;
  loading = false;
  statusMessage = '';
  statusType: 'success' | 'error' | '' = '';
  lastCount: number | null = null;
  lastPath: string | null = null;
  lastModified: number | null = null;
  lastSizeBytes: number | null = null;

  constructor(
    private febiPriceAdminService: FebiPriceAdminService,
    private snackbarService: SnackbarService
  ) { }

  ngOnInit(): void {
    this.loadMeta();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadFile = input?.files?.[0] ?? null;
  }

  castUpload(): void {
    if (this.loading) {
      return;
    }
    if (!this.uploadFile) {
      this.setStatus('Izaberi .xlsx fajl pre nego što baciš čini.', 'error');
      return;
    }

    this.loading = true;
    this.febiPriceAdminService
      .uploadPriceList(this.uploadFile)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) =>
          this.handleSuccess(response, 'Spell succeeded: upload & reload'),
        error: (err) => this.handleError(err),
      });
  }

  recastFromDisk(): void {
    if (this.loading) {
      return;
    }
    this.loading = true;
    this.febiPriceAdminService
      .reloadFromDisk()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (response) =>
          this.handleSuccess(response, 'Recast from disk succeeded'),
        error: (err) => this.handleError(err),
      });
  }

  private handleSuccess(response: PriceReloadResponse, message: string): void {
    this.lastCount = response?.count ?? null;
    this.lastPath = response?.path ?? null;
    this.lastModified = response?.lastModified ?? null;
    this.lastSizeBytes = response?.sizeBytes ?? null;
    this.setStatus(
        `${message}. Tomes indexed: ${this.lastCount ?? 0}${
            this.lastPath ? ` | Path: ${this.lastPath}` : ''}`,
        'success');
    this.snackbarService.showSuccess(message);
    this.uploadFile = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  private handleError(error: any): void {
    const message =
      error?.error?.message ||
      error?.message ||
      'Mishap! Čini se da je čarolija pošla naopako.';
    this.setStatus(message, 'error');
    this.snackbarService.showError(message);
  }

  private setStatus(message: string, type: 'success' | 'error'): void {
    this.statusMessage = message;
    this.statusType = type;
  }

  private loadMeta(): void {
    this.febiPriceAdminService.fetchMeta().subscribe({
      next: (info: PriceFileInfoResponse) => {
        this.lastPath = info?.path ?? this.lastPath;
        this.lastModified = info?.lastModified ?? this.lastModified;
        this.lastSizeBytes = info?.sizeBytes ?? this.lastSizeBytes;
      },
      error: () => {
        // ignore; meta is optional
      },
    });
  }
}
