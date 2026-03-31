import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { PayrollService } from '../../services/payroll.service';
import { SettingsService } from '../../../settings/services/settings.service';
import { take } from 'rxjs';

export interface AbsentRecordDto {
  id: string;
  employeeId: string;
  employeeName: string;
  positionName: string;
  initials: string;
  avatarColor: string;
  absentDays: number;
  halfDays: number;
  effectiveAbsents: number;
  graceDays: number;
  deductibleDays: number;
  deductionAmount: number;
}

@Component({
  selector: 'app-time-tracking-absents',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatDialogModule, MatProgressSpinnerModule, FormsModule],
  templateUrl: './time-tracking-absents.component.html',
  styleUrl: './time-tracking-absents.component.scss'
})
export class TimeTrackingAbsentsComponent implements OnInit {
  private readonly payrollService = inject(PayrollService);
  private readonly settingsService = inject(SettingsService);

  readonly records = signal<AbsentRecordDto[]>([]);
  readonly isLoading = signal(true);
  readonly currencySymbol = signal('$');

  // Stats
  readonly totalAbsents = signal(11);
  readonly totalDeduction = signal(22400);
  readonly employeesAffected = signal(4);
  readonly graceDaysUsed = signal(3);

  ngOnInit(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(take(1))
      .subscribe({
        next: (currencyCode) => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol(currencyCode));
        },
        error: () => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol());
        }
      });

    this.fetchAbsents();
  }

  fetchAbsents(): void {
    this.isLoading.set(true);
    // For now, mock the data from the stitch screen
    setTimeout(() => {
      this.records.set([
        {
          id: '1',
          employeeId: 'e1',
          employeeName: 'Ali Hassan',
          positionName: 'Software Engineer',
          initials: 'AH',
          avatarColor: 'blue',
          absentDays: 3,
          halfDays: 1,
          effectiveAbsents: 3.5,
          graceDays: 1,
          deductibleDays: 2.5,
          deductionAmount: 7200
        },
        {
          id: '2',
          employeeId: 'e2',
          employeeName: 'Sara Ahmed',
          positionName: 'HR Manager',
          initials: 'SA',
          avatarColor: 'pink',
          absentDays: 2,
          halfDays: 0,
          effectiveAbsents: 2.0,
          graceDays: 1,
          deductibleDays: 1.0,
          deductionAmount: 3100
        },
        {
          id: '3',
          employeeId: 'e3',
          employeeName: 'Usman Khan',
          positionName: 'Product Designer',
          initials: 'UK',
          avatarColor: 'amber',
          absentDays: 1,
          halfDays: 2,
          effectiveAbsents: 2.0,
          graceDays: 1,
          deductibleDays: 1.0,
          deductionAmount: 2800
        },
        {
          id: '4',
          employeeId: 'e4',
          employeeName: 'Nadia Qureshi',
          positionName: 'QA Lead',
          initials: 'NQ',
          avatarColor: 'purple',
          absentDays: 1,
          halfDays: 0,
          effectiveAbsents: 1.0,
          graceDays: 1,
          deductibleDays: 0.0,
          deductionAmount: 0
        }
      ]);
      this.isLoading.set(false);
    }, 600);
  }

  logAbsent(): void {
    // To be implemented: Open dialog to log an absence
  }

  editRecord(record: AbsentRecordDto): void {
    // To be implemented
  }

  deleteRecord(record: AbsentRecordDto): void {
    // To be implemented
  }
}
