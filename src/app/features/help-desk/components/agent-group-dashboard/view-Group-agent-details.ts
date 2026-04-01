import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TicketGroup } from '../../../../core/models/helpdesk.models';

@Component({
  selector: 'app-view-group-agent-details',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 class="dialog-title">Group Details</h2>
        <button mat-icon-button (click)="closeDialog()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content">
        <div class="detail-section">
          <label class="detail-label">Group Name:</label>
          <p class="detail-value">{{ group?.groupTitle }}</p>
        </div>
        <div class="detail-section">
          <label class="detail-label">Department:</label>
          <p class="detail-value">{{ group?.departmentName || 'N/A' }}</p>
        </div>

        <div class="detail-section">
          <label class="detail-label">Category:</label>
          <p class="detail-value">{{ group?.categoryName || 'N/A' }}</p>
        </div>

        <div class="detail-section">
          <label class="detail-label">Agents:</label>
          <div class="agent-list">
            <div *ngIf="(group?.employeeNames || []).length > 0">
              <ul class="agents-ul">
                <li *ngFor="let agent of group?.employeeNames || []" class="agent-item">{{ agent }}</li>
              </ul>
            </div>
            <p *ngIf="!(group?.employeeNames || []).length" class="no-agents">
              No agents assigned
            </p>
          </div>
        </div>

        <div class="detail-section" *ngIf="group?.createdAt">
          <label class="detail-label">Created Date:</label>
          <p class="detail-value">{{ group?.createdAt | date: 'short' }}</p>
        </div>
      </div>

      <div class="dialog-footer">
        <button mat-raised-button color="primary" (click)="closeDialog()">
          Close
        </button>
      </div>
    </div>
  `,
styles: [`
    .dialog-container {
      display: flex;
      flex-direction: column;
      max-height: 80vh;
      min-width: 400px;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      border-bottom: 1px solid #e8e8e8;
      background: #ffffff;
      color: #1a1a1a;
    }

    .dialog-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .close-button {
  color: #666666;
  width: 32px;
  height: 32px;
  
  /* Flex ensures the icon stays dead-center regardless of line-height */
  display: flex !important;
  align-items: center;
  justify-content: center;
}
.close-button.cdk-program-focused .mat-mdc-button-persistent-ripple {
  display: none;
}
    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 0;
      background-color: #ffffff;
    }

    .detail-section {
      padding: 8px 20px;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-section:last-child {
      border-bottom: none;
    }

    .detail-label {
      display: block;
      font-weight: 700;
      color: #555555;
      margin-bottom: 2px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-value {
      margin: 0;
      color: #222222;
      font-size: 13px;
      line-height: 1.4;
    }

    .no-agents {
      color: #999;
      font-style: italic;
      margin: 0;
      font-size: 13px;
    }

    .agent-list {
      margin-top: 2px;
    }

    .agents-ul {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .agent-item {
      padding: 3px 10px;
      background-color: #f0f4ff;
      border: 1px solid #d6e0ff;
      border-radius: 20px;
      color: #3b5bdb;
      font-size: 12px;
      font-weight: 500;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 10px 20px;
      border-top: 1px solid #e8e8e8;
      background-color: #ffffff;
    }

    .dialog-footer button {
      margin-left: 10px;
      border-radius: 6px;
      padding: 4px 18px;
      font-size: 13px;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .dialog-container {
        min-width: auto;
        width: 100%;
      }
    }
  `]

})
export class ViewGroupAgentDetailsComponent implements OnInit {
  group: TicketGroup;

  constructor(
    public dialogRef: MatDialogRef<ViewGroupAgentDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { group: TicketGroup }
  ) {
    this.group = data.group;
  }

  ngOnInit(): void {
    // Component initialization if needed
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}
