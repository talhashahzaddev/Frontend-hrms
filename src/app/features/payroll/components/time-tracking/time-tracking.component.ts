// Force recompile
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AttendanceDialogComponent } from '../attendance-dialog/attendance-dialog.component';
import { SettingsService } from '../../../settings/services/settings.service';
import { take } from 'rxjs';
import {
  ConfirmDeleteDialogComponent,
  ConfirmDeleteData
} from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-time-tracking',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule],
  templateUrl: './time-tracking.component.html',
  styleUrl: './time-tracking.component.scss'
})
export class TimeTrackingComponent implements OnInit {
  currencySymbol = signal('$');
  records = [
    { name: 'Ali Hassan', initials: 'AH', color: 'blue', date: 'Mar 12, 2025', hours: 3.5, rate: '1,200', amount: '4,200', type: 'Regular', typeClass: 'type-regular' },
    { name: 'Sara Ahmed', initials: 'SA', color: 'pink', date: 'Mar 13, 2025', hours: 4.0, rate: '1,500', amount: '6,000', type: 'Holiday', typeClass: 'type-holiday' },
    { name: 'Usman Khan', initials: 'UK', color: 'amber', date: 'Mar 14, 2025', hours: 2.0, rate: '1,100', amount: '2,200', type: 'Regular', typeClass: 'type-regular' },
    { name: 'Fatima Malik', initials: 'FM', color: 'emerald', date: 'Mar 15, 2025', hours: 5.5, rate: '2,000', amount: '11,000', type: 'Weekend', typeClass: 'type-weekend' },
    { name: 'Bilal Raza', initials: 'BR', color: 'indigo', date: 'Mar 16, 2025', hours: 3.0, rate: '1,200', amount: '3,600', type: 'Regular', typeClass: 'type-regular' },
    { name: 'Nadia Qureshi', initials: 'NQ', color: 'purple', date: 'Mar 17, 2025', hours: 2.5, rate: '1,400', amount: '3,500', type: 'Regular', typeClass: 'type-regular' }
  ];

  constructor(
    private dialog: MatDialog, 
    private settingsService: SettingsService,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.settingsService.getOrganizationCurrency().pipe(take(1)).subscribe({
      next: (code) => this.currencySymbol.set(this.settingsService.getCurrencySymbol(code)),
      error: () => this.currencySymbol.set(this.settingsService.getCurrencySymbol())
    });
  }

  openDialog(mode: 'add' | 'edit', record?: any, type: string = 'overtime') {
    const dialogRef = this.dialog.open(AttendanceDialogComponent, {
      width: '480px',
      panelClass: 'custom-dialog-container',
      data: {
        type: type,
        mode: mode,
        record: record
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Dialog result:', result);
        // Implement API call and record update logic here later
      }
    });
  }

  onDelete(record: any): void {
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Record',
      message: 'Are you sure you want to delete this attendance record?',
      itemName: record.name,
      confirmButtonText: 'Yes, Delete'
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '450px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.records = this.records.filter(r => r !== record);
        this.notification.showSuccess('Record deleted successfully');
      }
    });
  }
}
