import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { SharedCommonModule } from '@shared/shared-common.module';
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
    SharedCommonModule,
        CommonModule,
        FormsModule,
        MatDialogModule,
        MatButtonModule
    ],
    template: `
    <div class="comment-dialog">
      <div class="comment-dialog-header">
        <div class="header-icon">💬</div>
        <h2>{{ data.title }}</h2>
      </div>

      <div class="comment-dialog-body">
        <div class="comment-dialog-field">
          <label class="field-label" for="comment-input">{{ data.label }}</label>
          <textarea
            id="comment-input"
            class="field-textarea"
            [(ngModel)]="comment"
            [placeholder]="data.placeholder || ''"
            rows="4"
            [required]="data.required || false">
          </textarea>
        </div>
      </div>

      <div class="comment-dialog-footer">
        <button mat-stroked-button (click)="onCancel()" class="btn-cancel">Cancel</button>
        <button mat-flat-button color="primary"
                (click)="onConfirm()"
                class="btn-submit"
                [disabled]="data.required && !comment">
          Submit
        </button>
      </div>
    </div>
  `,
    styles: [`
    :host ::ng-deep .mdc-dialog__surface {
      min-width: unset !important;
      width: auto !important;
      border-radius: 0.875rem !important;
      overflow: hidden !important;
    }

    :host ::ng-deep .mat-mdc-dialog-container {
      border-radius: 0.875rem !important;
      padding: 0 !important;
      box-shadow: 0 20px 60px rgba(0,0,0,0.15) !important;
    }

    .comment-dialog {
      width: 440px;
      max-width: 92vw;
      background: #ffffff;
      border-radius: 0.875rem;
      overflow: hidden;
      font-family: 'Inter', sans-serif;
      box-sizing: border-box;
    }

    .comment-dialog-header {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #e2e8f0;
      background: #ffffff;

      .header-icon {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.625rem;
        background: #eff6ff;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 1.125rem;
        color: #2563eb;
      }

      h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.3;
      }
    }

    .comment-dialog-body {
      display: block;
      padding: 1.25rem 1.5rem 1.5rem !important;
      margin: 0 !important;
      background: #f8fafc !important;
      box-sizing: border-box;
    }

    .comment-dialog-field {
      padding: 0;
      box-sizing: border-box;
    }

    .field-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      color: #475569;
      margin: 0 0 0.5rem;
      line-height: 1.4;
    }

    .field-textarea {
      display: block;
      width: 100%;
      max-width: 100%;
      padding: 0.75rem 0.875rem;
      margin: 0;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: #0f172a;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      font-family: inherit;
      box-sizing: border-box;
      resize: vertical;
      min-height: 100px;
      line-height: 1.55;
    }

    .field-textarea::placeholder { color: #94a3b8; }
    .field-textarea:hover { border-color: #94a3b8; }
    .field-textarea:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }

    .comment-dialog-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 0.5rem;
      padding: 0.875rem 1.5rem;
      border-top: 1px solid #e2e8f0;
      background: #ffffff;
    }

    .btn-cancel {
      height: 2.25rem !important;
      padding: 0 1rem !important;
      border-radius: 0.5rem !important;
      font-size: 0.875rem !important;
      font-weight: 600 !important;
      color: #475569 !important;
      border-color: #e2e8f0 !important;
      background: #ffffff !important;
    }
    .btn-cancel:hover {
      background: #f8fafc !important;
      color: #0f172a !important;
    }

    .btn-submit {
      height: 2.25rem !important;
      padding: 0 1rem !important;
      border-radius: 0.5rem !important;
      font-size: 0.875rem !important;
      font-weight: 600 !important;
      background: #2563eb !important;
      color: #ffffff !important;
      box-shadow: none !important;
    }
    .btn-submit:hover:not([disabled]) {
      background: #1d4ed8 !important;
      box-shadow: 0 4px 8px rgba(37, 99, 235, 0.2) !important;
    }
    .btn-submit[disabled] { opacity: 0.5; cursor: not-allowed; }

    @media (max-width: 480px) {
      .comment-dialog { width: 100%; }
      .comment-dialog-header,
      .comment-dialog-body,
      .comment-dialog-footer { padding-left: 1.25rem; padding-right: 1.25rem; }
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
