import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import {
  AddPerformancePayDialogComponent,
  PerformanceDialogResult
} from '../dialogs/add-performance-pay-dialog/add-performance-pay-dialog.component';
import { DeleteActionDialogComponent } from '../dialogs/delete-action-dialog/delete-action-dialog.component';

interface PerformanceLedgerRow {
  id: number;
  employeeName: string;
  initials: string;
  designation: string;
  period: string;
  score: number;
  rating: 'Excellent' | 'Good' | 'Average' | 'Below average';
  amount: number;
  calculatedAt: string;
  avatarTone: 'blue' | 'lavender' | 'peach' | 'gray' | 'slate';
}

@Component({
  selector: 'app-performance-pay',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './performance-pay.component.html',
  styleUrl: './performance-pay.component.scss'
})
export class PerformancePayComponent {
  searchText = '';
  selectedRating: 'All' | PerformanceLedgerRow['rating'] = 'All';

  readonly ratingOptions: Array<'All' | PerformanceLedgerRow['rating']> = ['All', 'Excellent', 'Good', 'Average', 'Below average'];

  rows: PerformanceLedgerRow[] = [
    {
      id: 1,
      employeeName: 'Ali Hassan',
      initials: 'AH',
      designation: 'Senior Editor',
      period: 'Oct 2024',
      score: 94,
      rating: 'Excellent',
      amount: 38000,
      calculatedAt: '24 Oct, 2024',
      avatarTone: 'blue'
    },
    {
      id: 2,
      employeeName: 'Sara Ahmed',
      initials: 'SA',
      designation: 'Content Strategist',
      period: 'Oct 2024',
      score: 88.5,
      rating: 'Excellent',
      amount: 32000,
      calculatedAt: '24 Oct, 2024',
      avatarTone: 'lavender'
    },
    {
      id: 3,
      employeeName: 'Usman Khan',
      initials: 'UK',
      designation: 'HR Associate',
      period: 'Oct 2024',
      score: 79,
      rating: 'Good',
      amount: 28500,
      calculatedAt: '23 Oct, 2024',
      avatarTone: 'peach'
    },
    {
      id: 4,
      employeeName: 'Fatima Malik',
      initials: 'FM',
      designation: 'Graphic Designer',
      period: 'Oct 2024',
      score: 72.5,
      rating: 'Average',
      amount: 24000,
      calculatedAt: '22 Oct, 2024',
      avatarTone: 'gray'
    },
    {
      id: 5,
      employeeName: 'Bilal Raza',
      initials: 'BR',
      designation: 'Copywriter',
      period: 'Oct 2024',
      score: 58,
      rating: 'Below average',
      amount: 20000,
      calculatedAt: '22 Oct, 2024',
      avatarTone: 'slate'
    }
  ];

  constructor(private dialog: MatDialog) {}

  get filteredRows(): PerformanceLedgerRow[] {
    const query = this.searchText.trim().toLowerCase();

    return this.rows.filter((row) => {
      const matchesSearch = !query
        || row.employeeName.toLowerCase().includes(query)
        || row.designation.toLowerCase().includes(query);
      const matchesRating = this.selectedRating === 'All' || row.rating === this.selectedRating;

      return matchesSearch && matchesRating;
    });
  }

  get totalPayout(): number {
    return this.rows.reduce((sum, row) => sum + row.amount, 0);
  }

  get avgScore(): number {
    if (!this.rows.length) return 0;
    const totalScore = this.rows.reduce((sum, row) => sum + row.score, 0);
    return Number((totalScore / this.rows.length).toFixed(1));
  }

  get topRating(): string {
    const ratingsByPriority: PerformanceLedgerRow['rating'][] = ['Excellent', 'Good', 'Average', 'Below average'];
    return ratingsByPriority.find((rating) => this.rows.some((row) => row.rating === rating)) ?? '-';
  }

  openAddPerformanceDialog(): void {
    const dialogRef = this.dialog.open(AddPerformancePayDialogComponent, {
      width: '480px',
      panelClass: 'performance-dialog-panel',
      autoFocus: false,
      restoreFocus: false
    });

    dialogRef.afterClosed().subscribe((result: PerformanceDialogResult | undefined) => {
      if (!result) return;

      const nextId = this.rows.length ? Math.max(...this.rows.map((row) => row.id)) + 1 : 1;

      this.rows = [
        {
          id: nextId,
          employeeName: result.employee,
          initials: this.toInitials(result.employee),
          designation: result.designation,
          period: result.payrollPeriod,
          score: result.score,
          rating: result.rating,
          amount: result.amount,
          calculatedAt: result.calculatedAt,
          avatarTone: 'blue'
        },
        ...this.rows
      ];
    });
  }

  openEditPerformanceDialog(row: PerformanceLedgerRow): void {
    const dialogRef = this.dialog.open(AddPerformancePayDialogComponent, {
      width: '480px',
      panelClass: 'performance-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        mode: 'edit',
        initialValue: {
          employee: row.employeeName,
          designation: row.designation,
          payrollPeriod: row.period,
          performanceId: 'REF-PR-001',
          score: row.score,
          rating: row.rating,
          amount: row.amount,
          calculatedAt: row.calculatedAt
        }
      }
    });

    dialogRef.afterClosed().subscribe((result: PerformanceDialogResult | undefined) => {
      if (!result) return;

      this.rows = this.rows.map((existingRow) => {
        if (existingRow.id !== row.id) {
          return existingRow;
        }

        return {
          ...existingRow,
          employeeName: result.employee,
          initials: this.toInitials(result.employee),
          designation: result.designation,
          period: result.payrollPeriod,
          score: result.score,
          rating: result.rating,
          amount: result.amount,
          calculatedAt: result.calculatedAt
        };
      });
    });
  }

  deleteRow(id: number): void {
    this.rows = this.rows.filter((row) => row.id !== id);
  }

  requestDeleteRow(row: PerformanceLedgerRow): void {
    const dialogRef = this.dialog.open(DeleteActionDialogComponent, {
      width: '420px',
      panelClass: 'delete-dialog-panel',
      autoFocus: false,
      restoreFocus: false,
      data: {
        title: 'Delete performance pay',
        message: `Delete performance record for ${row.employeeName}? This action cannot be undone.`,
        confirmText: 'Delete record'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deleteRow(row.id);
      }
    });
  }

  trackById(_: number, row: PerformanceLedgerRow): number {
    return row.id;
  }

  private toInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}
