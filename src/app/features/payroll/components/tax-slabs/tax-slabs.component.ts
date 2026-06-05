import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { PayrollService, TaxCategoryDto, TaxSlabDto } from '../../services/payroll.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { hasPayrollRulePermission, watchPayrollRuleViewAccess } from '../../utils/payroll-rule-permissions';
import {
  ConfirmDeleteData,
  ConfirmDeleteDialogComponent
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { TaxEntityDialogComponent } from '../dialogs/tax-entity-dialog/tax-entity-dialog.component';


import { SharedCommonModule } from '@shared/shared-common.module';
@Component({
  selector: 'app-tax-slabs',
  standalone: true,
  imports: [
    SharedCommonModule,CommonModule, MatIconModule, RouterModule, MatDialogModule, MatProgressSpinnerModule, MatButtonModule],
  templateUrl: './tax-slabs.component.html',
  styleUrl: './tax-slabs.component.scss'
})
export class TaxSlabsComponent implements OnInit {
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
  readonly taxSlabs = signal<TaxSlabDto[]>([]);
  readonly taxCategories = signal<TaxCategoryDto[]>([]);
  readonly isLoading = signal(true);

  ngOnInit(): void {
    watchPayrollRuleViewAccess(this.authService, 'tax_slab_view', {
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
    if (!this.hasPermission('tax_slab_add')) return;
    const dialogRef = this.dialog.open(TaxEntityDialogComponent, {
      width: '620px',
      data: {
        entityType: 'slab',
        mode: 'create',
        title: 'Create Tax Slab',
        submitText: 'Create Slab',
        categories: this.categoryOptions()
      }
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.payrollService.createTaxSlab(payload).subscribe({
        next: () => {
          this.notification.showSuccess('Tax slab created successfully');
          this.fetchSlabs();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to create tax slab');
        }
      });
    });
  }

  editSlab(slab: TaxSlabDto): void {
    if (!this.hasPermission('tax_slab_edit')) return;
    const dialogRef = this.dialog.open(TaxEntityDialogComponent, {
      width: '620px',
      data: {
        entityType: 'slab',
        mode: 'edit',
        title: 'Edit Tax Slab',
        submitText: 'Save Changes',
        categories: this.categoryOptions(),
        initialValue: {
          categoryId: slab.categoryId,
          slabOrder: slab.slabOrder,
          minIncome: slab.minIncome,
          maxIncome: slab.maxIncome ?? null,
          fixedAmount: slab.fixedAmount,
          percentage: slab.percentage
        }
      }
    });

    dialogRef.afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.payrollService.updateTaxSlab(slab.slabId, payload).subscribe({
        next: () => {
          this.notification.showSuccess('Tax slab updated successfully');
          this.fetchSlabs();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to update tax slab');
        }
      });
    });
  }

  deleteSlab(slab: TaxSlabDto): void {
    if (!this.hasPermission('tax_slab_delete')) return;
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Tax Slab',
      message: 'Are you sure you want to delete this tax slab?',
      itemName: `${slab.categoryName || 'Category'} - #${slab.slabOrder}`,
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result !== true) return;
      this.payrollService.deleteTaxSlab(slab.slabId).subscribe({
        next: () => {
          this.notification.showSuccess('Tax slab deleted successfully');
          this.fetchSlabs();
        },
        error: (err) => {
          console.error(err);
          this.notification.showError('Failed to delete tax slab');
        }
      });
    });
  }

  private fetchData(): void {
    this.isLoading.set(true);
    this.payrollService.getActiveTaxCategories().subscribe({
      next: (categories) => {
        this.taxCategories.set(categories || []);
        this.fetchSlabs();
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load tax categories');
        this.isLoading.set(false);
      }
    });
  }

  private fetchSlabs(): void {
    this.payrollService.getTaxSlabs().subscribe({
      next: (slabs) => {
        this.taxSlabs.set(slabs || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.notification.showError('Failed to load tax slabs');
        this.isLoading.set(false);
      }
    });
  }

  private categoryOptions(): Array<{ id: string; label: string }> {
    return this.taxCategories().map((category) => ({
      id: category.categoryId,
      label: `${category.categoryName || 'Unnamed Category'}${category.regimeName ? ` (${category.regimeName})` : ''}`
    }));
  }

  hasPermission(actionKey: string): boolean {
    return hasPayrollRulePermission(this.authService, actionKey);
  }
}
