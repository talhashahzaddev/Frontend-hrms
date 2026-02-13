import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { OfficeIP } from '../../../../core/models/attendance.models';
import { NotificationService } from '@/app/core/services/notification.service';

@Component({
  selector: 'app-edit-office-ip-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule // ✅ Needed for <mat-dialog-content> and dialog features
  ],
  template: `
  <h2 mat-dialog-title>Edit Office IP</h2>
  <mat-dialog-content>
    <form [formGroup]="ipForm" (ngSubmit)="onSubmit()">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>IP Address</mat-label>
        <input matInput formControlName="ipAddressValue">
        <mat-error *ngIf="ipForm.get('ipAddressValue')?.invalid && ipForm.get('ipAddressValue')?.touched">
          Please enter a valid IP
        </mat-error>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Name</mat-label>
        <input matInput formControlName="name">
        <mat-error *ngIf="ipForm.get('name')?.invalid && ipForm.get('name')?.touched">
          Name is required
        </mat-error>
      </mat-form-field>

      <div class="actions">
        <button mat-stroked-button type="button" (click)="close()">Cancel</button>
        <button mat-flat-button color="primary" type="submit" [disabled]="ipForm.invalid">Save</button>
      </div>
    </form>
  </mat-dialog-content>
  `,
  styles: [`
    .full-width { width: 100%; }
    .actions { margin-top: 15px; display: flex; justify-content: flex-end; gap: 10px; }
  `]
})
export class EditOfficeIPDialogComponent {
  ipForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private notification: NotificationService,
    private dialogRef: MatDialogRef<EditOfficeIPDialogComponent>, // ✅ Correct type
    @Inject(MAT_DIALOG_DATA) public data: OfficeIP
  ) {
    this.ipForm = this.fb.group({
      ipAddressValue: [data.ipAddressValue, [Validators.required, Validators.pattern(/^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}$/)]],
      name: [data.name, Validators.required]
    });
  }

  onSubmit(): void {
    if (this.ipForm.valid) {
      const updatedIP = { ...this.data, ...this.ipForm.value };
      this.dialogRef.close(updatedIP);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
