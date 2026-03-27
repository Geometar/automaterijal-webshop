import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { finalize } from 'rxjs';

import { AutomIconComponent } from '../../../../shared/components/autom-icon/autom-icon.component';
import { IconsEnum } from '../../../../shared/data-models/enums';
import {
  DeadStockImportResponse,
  DeadStockPricingMode,
  DeadStockRule,
  DeadStockRulePayload,
  DeadStockStatusResponse,
  HogwartsAdminService,
} from '../../../../shared/service/hogwarts-admin.service';
import { SnackbarService } from '../../../../shared/service/utils/snackbar.service';

interface DeadStockRuleFormValue {
  name: string;
  minDaysInclusive: number;
  maxDaysInclusive: number;
  pricingMode: DeadStockPricingMode;
  pricingValue: number;
  badgeLabel: string;
  active: boolean;
  sortOrder: number;
}

@Component({
  selector: 'app-hogwarts-dead-stock',
  standalone: true,
  imports: [CommonModule, AutomIconComponent],
  templateUrl: './hogwarts-dead-stock.component.html',
  encapsulation: ViewEncapsulation.None,
})
export class HogwartsDeadStockComponent {
  @ViewChild('deadStockFileInput') deadStockFileInput?: ElementRef<HTMLInputElement>;

  icons = IconsEnum;
  deadStockUploadFile: File | null = null;
  deadStockLoading = false;
  deadStockRulesLoading = false;
  deadStockStatusLoading = false;
  deadStockMessage = '';
  deadStockType: 'success' | 'error' | '' = '';
  deadStockStatus: DeadStockStatusResponse | null = null;
  deadStockRules: DeadStockRule[] = [];
  deadStockEditingRuleId: number | null = null;
  deadStockRuleForm: DeadStockRuleFormValue = this.createDefaultRuleForm();

  constructor(
    private hogwartsAdminService: HogwartsAdminService,
    private snackbarService: SnackbarService
  ) {}

  ngOnInit(): void {
    this.refreshDeadStockStatus();
    this.refreshDeadStockRules();
  }

  onDeadStockFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.deadStockUploadFile = input?.files?.[0] ?? null;
  }

  castDeadStockUpload(): void {
    if (this.deadStockLoading) {
      return;
    }
    if (!this.deadStockUploadFile) {
      this.setDeadStockStatus('Choose a dead stock .xlsx file first.', 'error');
      return;
    }
    this.deadStockLoading = true;
    this.hogwartsAdminService
      .uploadDeadStock(this.deadStockUploadFile)
      .pipe(finalize(() => (this.deadStockLoading = false)))
      .subscribe({
        next: (response) => this.handleDeadStockImportSuccess(response),
        error: (err) => this.handleDeadStockError(err),
      });
  }

  refreshDeadStockStatus(): void {
    if (this.deadStockStatusLoading) {
      return;
    }
    this.deadStockStatusLoading = true;
    this.hogwartsAdminService
      .fetchDeadStockStatus()
      .pipe(finalize(() => (this.deadStockStatusLoading = false)))
      .subscribe({
        next: (status) => {
          this.deadStockStatus = status;
        },
        error: (err) => this.handleDeadStockError(err),
      });
  }

  refreshDeadStockRules(): void {
    if (this.deadStockRulesLoading) {
      return;
    }
    this.deadStockRulesLoading = true;
    this.hogwartsAdminService
      .fetchDeadStockRules()
      .pipe(finalize(() => (this.deadStockRulesLoading = false)))
      .subscribe({
        next: (rules) => {
          this.deadStockRules = rules;
        },
        error: (err) => this.handleDeadStockError(err),
      });
  }

  saveDeadStockRule(): void {
    if (this.deadStockRulesLoading) {
      return;
    }
    const payload = this.buildDeadStockRulePayload();
    if (!payload || !this.validateDeadStockRulePayload(payload)) {
      return;
    }

    this.deadStockRulesLoading = true;
    const request$ = this.deadStockEditingRuleId
      ? this.hogwartsAdminService.updateDeadStockRule(this.deadStockEditingRuleId, payload)
      : this.hogwartsAdminService.createDeadStockRule(payload);

    request$
      .pipe(finalize(() => (this.deadStockRulesLoading = false)))
      .subscribe({
        next: () => {
          this.setDeadStockStatus(
            this.deadStockEditingRuleId ? 'Dead stock rule updated.' : 'Dead stock rule created.',
            'success'
          );
          this.snackbarService.showSuccess('Dead stock rule saved');
          this.resetDeadStockRuleForm();
          this.refreshDeadStockRules();
        },
        error: (err) => this.handleDeadStockError(err),
      });
  }

  editDeadStockRule(rule: DeadStockRule): void {
    this.deadStockEditingRuleId = rule.id;
    this.deadStockRuleForm = {
      name: rule.name,
      minDaysInclusive: rule.minDaysInclusive,
      maxDaysInclusive: rule.maxDaysInclusive ?? 0,
      pricingMode: rule.pricingMode,
      pricingValue: rule.pricingValue ?? 0,
      badgeLabel: rule.badgeLabel ?? '',
      active: rule.active,
      sortOrder: rule.sortOrder,
    };
  }

  resetDeadStockRuleForm(): void {
    this.deadStockEditingRuleId = null;
    this.deadStockRuleForm = this.createDefaultRuleForm();
  }

  deleteDeadStockRule(rule: DeadStockRule): void {
    if (this.deadStockRulesLoading || !rule?.id) {
      return;
    }
    if (!window.confirm(`Delete rule "${rule.name}"?`)) {
      return;
    }
    this.deadStockRulesLoading = true;
    this.hogwartsAdminService
      .deleteDeadStockRule(rule.id)
      .pipe(finalize(() => (this.deadStockRulesLoading = false)))
      .subscribe({
        next: () => {
          this.setDeadStockStatus('Dead stock rule deleted.', 'success');
          this.snackbarService.showSuccess('Dead stock rule deleted');
          if (this.deadStockEditingRuleId === rule.id) {
            this.resetDeadStockRuleForm();
          }
          this.refreshDeadStockRules();
        },
        error: (err) => this.handleDeadStockError(err),
      });
  }

  private createDefaultRuleForm(): DeadStockRuleFormValue {
    return {
      name: '',
      minDaysInclusive: 366,
      maxDaysInclusive: 1825,
      pricingMode: 'MARKUP_ON_COST',
      pricingValue: 10,
      badgeLabel: 'Akcija',
      active: true,
      sortOrder: 10,
    };
  }

  private buildDeadStockRulePayload(): DeadStockRulePayload | null {
    const name = this.deadStockRuleForm.name.trim();
    if (!name) {
      this.setDeadStockStatus('Rule name is required.', 'error');
      return null;
    }

    const pricingValue =
      this.deadStockRuleForm.pricingMode === 'AT_COST'
        ? 0
        : Number(this.deadStockRuleForm.pricingValue);

    return {
      name,
      minDaysInclusive: Number(this.deadStockRuleForm.minDaysInclusive),
      maxDaysInclusive:
        Number(this.deadStockRuleForm.maxDaysInclusive) > 0
          ? Number(this.deadStockRuleForm.maxDaysInclusive)
          : null,
      pricingMode: this.deadStockRuleForm.pricingMode,
      pricingValue: Number.isFinite(pricingValue) ? pricingValue : null,
      badgeLabel: this.deadStockRuleForm.badgeLabel.trim() || null,
      active: !!this.deadStockRuleForm.active,
      sortOrder: Number(this.deadStockRuleForm.sortOrder),
    };
  }

  private validateDeadStockRulePayload(payload: DeadStockRulePayload): boolean {
    if (!Number.isFinite(payload.minDaysInclusive) || payload.minDaysInclusive < 0) {
      this.setDeadStockStatus('Min days mora biti 0 ili vece.', 'error');
      return false;
    }

    if (
      payload.maxDaysInclusive != null &&
      (!Number.isFinite(payload.maxDaysInclusive) || payload.maxDaysInclusive < payload.minDaysInclusive)
    ) {
      this.setDeadStockStatus('Max days mora biti vece ili jednako od Min days.', 'error');
      return false;
    }

    if (!Number.isFinite(payload.sortOrder)) {
      this.setDeadStockStatus('Sort order je obavezan.', 'error');
      return false;
    }

    if (
      payload.pricingMode === 'DISCOUNT_ON_CURRENT_PRICE' &&
      payload.pricingValue != null &&
      payload.pricingValue > 100
    ) {
      this.setDeadStockStatus('Discount on current price ne moze biti veci od 100.', 'error');
      return false;
    }

    if (!payload.active) {
      return true;
    }

    const candidateMin = payload.minDaysInclusive;
    const candidateMax = payload.maxDaysInclusive ?? Number.MAX_SAFE_INTEGER;

    const overlapping = this.deadStockRules.find((rule) => {
      if (!rule.active) {
        return false;
      }
      if (this.deadStockEditingRuleId && rule.id === this.deadStockEditingRuleId) {
        return false;
      }
      const ruleMin = rule.minDaysInclusive;
      const ruleMax = rule.maxDaysInclusive ?? Number.MAX_SAFE_INTEGER;
      return candidateMin <= ruleMax && ruleMin <= candidateMax;
    });

    if (overlapping) {
      this.setDeadStockStatus(
        `Rule overlaps with existing active rule "${overlapping.name}" (${overlapping.minDaysInclusive}-${overlapping.maxDaysInclusive ?? 'open'}).`,
        'error'
      );
      return false;
    }

    return true;
  }

  private handleDeadStockImportSuccess(response: DeadStockImportResponse): void {
    this.deadStockUploadFile = null;
    if (this.deadStockFileInput?.nativeElement) {
      this.deadStockFileInput.nativeElement.value = '';
    }
    this.setDeadStockStatus(
      `Dead stock import completed. Imported: ${response?.importedCount ?? 0} / ${response?.totalRowCount ?? 0} | Missing roba: ${response?.skippedMissingRobaCount ?? 0} | Duplicates: ${response?.duplicateRobaIdCount ?? 0} | Invalid: ${response?.invalidRowCount ?? 0}`,
      'success'
    );
    this.snackbarService.showSuccess('Dead stock imported');
    this.refreshDeadStockStatus();
  }

  private handleDeadStockError(error: any): void {
    const message = error?.error?.message || error?.message || 'Dead stock spell failed.';
    this.setDeadStockStatus(message, 'error');
    this.snackbarService.showError(message);
  }

  private setDeadStockStatus(message: string, type: 'success' | 'error'): void {
    this.deadStockMessage = message;
    this.deadStockType = type;
  }
}
