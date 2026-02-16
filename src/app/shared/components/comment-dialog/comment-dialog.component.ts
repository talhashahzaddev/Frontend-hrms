import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

export interface CommentDialogData {
    title: string;
    label: string;
    placeholder?: string;
    value?: string;
    required?: boolean;
}

@Component({
    selector: 'app-comment-dialog',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule
    ],
    template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>{{ data.label }}</mat-label>
        <textarea matInput 
                  [(ngModel)]="comment" 
                  [placeholder]="data.placeholder || ''"
                  rows="4"
                  [required]="data.required || false">
        </textarea>
        <mat-error *ngIf="data.required && !comment">Comment is required</mat-error>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              (click)="onConfirm()"
              [disabled]="data.required && !comment">
        Submit
      </button>
    </mat-dialog-actions>
  `,
    styles: [`
    .full-width {
      width: 100%;
      min-width: 300px;
    }
  `]
})
export class CommentDialogComponent {
    comment: string = '';

    constructor(
        public dialogRef: MatDialogRef<CommentDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: CommentDialogData
    ) {
        this.comment = data.value || '';
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onConfirm(): void {
        this.dialogRef.close(this.comment);
    }
}
