import { CommonModule } from '@angular/common';
import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface DeleteActionDialogData {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  confirmTheme?: 'danger' | 'success';
}

@Component({
  selector: 'app-delete-action-dialog',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  templateUrl: './delete-action-dialog.component.html',
  styleUrl: './delete-action-dialog.component.scss'
})
export class DeleteActionDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<DeleteActionDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: DeleteActionDialogData
  ) {}

  close(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
