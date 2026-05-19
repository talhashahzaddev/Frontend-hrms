import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { PayrollService, TaxCategoryDto, TaxRegimeDto } from '../../services/payroll.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { hasPayrollRulePermission, watchPayrollRuleViewAccess } from '../../utils/payroll-rule-permissions';
import {
  ConfirmDeleteData,
  ConfirmDeleteDialogComponent
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { TaxEntityDialogComponent } from '../dialogs/tax-entity-dialog/tax-entity-dialog.component';

@Component({
  selector: 'app-tax-categories',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule, MatDialogModule, MatProgressSpinnerModule, MatButtonModule],
  templateUrl: './tax-categories.component.html',
  styleUrl: './tax-categories.component.scss'
})
export class TaxCategoriesComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly payrollService = inject(PayrollService);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  readonly taxTabs = [
    { key: 'regime', label: 'Tax Regime', route: '/payroll/policies/tax-regime-rules' },
    { key: 'categories', label: 'Tax Categories', route: '/payroll/policies/tax-categories' },
    { key: 'slabs', label: 'Tax Slabs', route: '/payroll/policies/tax-slabs' },
    { key: 'rules', label: 'Tax Rules', route: '/payroll/policies/tax-rules' }
  ];
  readonly taxCategories = signal<TaxCategoryDto[]>([]);
  readonly taxRegimes = signal<TaxRegimeDto[]>([]);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    watchPayrollRuleViewAccess(this.authService, 'tax_category_view', {
      onAllowed: () => this.fetchData(),
      onDenied: () => this.isLoading.set(false)
    });
  }

  goBack(): void {
    this.router.navigate(['/payroll/policies']);
  }

  navigateToTab(route: string): void {
    this.router.navigate([route]);
  }

  openCreateDialog(): void {
    if (!this.hasPermission('tax_category_add')) return;
    const dialogRef = this.dialog.open(TaxEntityDialogComponent, {
      width: '560px',
      data: {
        entityType: 'category',
        mode: 'create',
        title: 'Create Tax Category',
        submitText: 'Create Category',
        regimes: this.regimeOptions()
      }
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.payrollService.createTaxCategory(payload).subscribe({
        next: () => {
          this.notification.showSuccess('Tax category created successfully');
          this.fetchCategories();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to create tax category');
        }
      });
    });
  }

  editCategory(category: TaxCategoryDto): void {
    if (!this.hasPermission('tax_category_edit')) return;
    const dialogRef = this.dialog.open(TaxEntityDialogComponent, {
      width: '560px',
      data: {
        entityType: 'category',
        mode: 'edit',
        title: 'Edit Tax Category',
        submitText: 'Save Changes',
        regimes: this.regimeOptions(),
        initialValue: {
          regimeId: category.regimeId,
          categoryName: category.categoryName ?? '',
          isActive: category.isActive
        }
      }
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.payrollService.updateTaxCategory(category.categoryId, payload).subscribe({
        next: () => {
          this.notification.showSuccess('Tax category updated successfully');
          this.fetchCategories();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to update tax category');
        }
      });
    });
  }

  toggleStatus(category: TaxCategoryDto): void {
    if (!this.hasPermission('tax_category_edit')) return;
    this.payrollService.updateTaxCategory(category.categoryId, {
      regimeId: category.regimeId,
      categoryName: category.categoryName ?? '',
      isActive: !category.isActive
    }).subscribe({
      next: () => {
        this.notification.showSuccess('Status updated successfully');
        this.fetchCategories();
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to update status');
      }
    });
  }

  deleteCategory(category: TaxCategoryDto): void {
    if (!this.hasPermission('tax_category_delete')) return;
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Tax Category',
      message: 'Are you sure you want to delete this tax category?',
      itemName: category.categoryName || 'this category',
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result !== true) return;
      this.payrollService.deleteTaxCategory(category.categoryId).subscribe({
        next: () => {
          this.notification.showSuccess('Tax category deleted successfully');
          this.fetchCategories();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to delete tax category');
        }
      });
    });
  }

  private fetchData(): void {
    this.isLoading.set(true);
    this.payrollService.getActiveTaxRegimes().subscribe({
      next: (regimes) => {
        this.taxRegimes.set(regimes || []);
        this.fetchCategories();
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load tax regimes');
        this.isLoading.set(false);
      }
    });
  }

  private fetchCategories(): void {
    this.payrollService.getTaxCategories().subscribe({
      next: (categories) => {
        this.taxCategories.set(categories || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load tax categories');
        this.isLoading.set(false);
      }
    });
  }

  private regimeOptions(): Array<{ id: string; label: string }> {
    return this.taxRegimes().map((regime) => ({
      id: regime.regimeId,
      label: `${regime.regimeName || 'Unnamed Regime'}${regime.country ? ` (${regime.country})` : ''}`
    }));
  }

  hasPermission(actionKey: string): boolean {
    return hasPayrollRulePermission(this.authService, actionKey);
  }
}
