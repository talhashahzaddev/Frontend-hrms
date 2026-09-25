import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Department, Employee } from '../../../../core/models/employee.models';

import { SharedCommonModule } from '@shared/shared-common.module';
export interface ViewDepartmentDetailsData {
  department: Department;
  managers: Employee[];
}


@Component({
  selector: 'app-view-department-details',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './view-department-details.component.html',
  styleUrls: ['./view-department-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewDepartmentDetailsComponent {

  constructor(
    private dialogRef: MatDialogRef<ViewDepartmentDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ViewDepartmentDetailsData
  ) {}

  getManagerName(managerId: string): string {
    const manager = this.data.managers.find(m => m.employeeId === managerId);
    return manager ? `${manager.fullName} — ${manager.email}` : 'Unknown Manager';
  }
}
