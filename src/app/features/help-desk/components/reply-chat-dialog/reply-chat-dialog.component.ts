import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HelpDeskService } from '../../services/help-desk.services';
import { TicketMessageRequest, TicketMessageDto, Ticket } from '../../../../core/models/helpdesk.models';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { Employee } from '@/app/core/models/employee.models';
import {  OnInit } from '@angular/core';
import { SharedCommonModule } from '@shared/shared-common.module';
export interface ReplyChatDialogData {
  ticket: Ticket; 
  senderId: string;       // Current user's ID
  senderEmail: string;
  recipientIds?: string[]; // Combined assigned + group employee IDs
}


@Component({
  selector: 'app-reply-chat-dialog',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './reply-chat-dialog.component.html',
  styleUrls: ['./reply-chat-dialog.component.scss'],
})
export class ReplyChatDialogComponent implements OnInit {
  replyForm: FormGroup;
  sending = false;
  recipientIds: string[] = [];
  recipientEmails: string[] = [];
employees: Employee[] = [];

  constructor(
    private fb: FormBuilder,
    private ticketService: HelpDeskService,
    private dialogRef: MatDialogRef<ReplyChatDialogComponent>,
    private employeeService: EmployeeService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: ReplyChatDialogData
  ) {
    // Log the incoming data
    console.log('Dialog data:', data);
    console.log('Sender ID:', data.senderId);
    console.log('Sender Email:', data.senderEmail);

    // Exclude sender from recipients - use combined list if provided, otherwise use assigned employees
    const allRecipients = data.recipientIds || (data.ticket.assignedEmployees || []);
    this.recipientIds = allRecipients.filter(
      id => id !== data.senderId
    );

    
    // Initialize the reactive form with senderEmail as readonly
    this.replyForm = this.fb.group({
      senderEmail: [{ value: data.senderEmail, disabled: true }],
      subject: [data.ticket.ticketTitle || ''],
      message: ['', Validators.required],
    });
  }
  ngOnInit(): void {
    this.loadRecipients();
  }

  sendReply(): void {
    if (this.replyForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.sending = true;

    const request: TicketMessageRequest = {
      ticketId: this.data.ticket.ticketid,
      message: this.replyForm.get('message')?.value,
      messageType: 'email',
      subject: this.replyForm.get('subject')?.value || undefined,
      recipientIds: this.recipientIds,
      senderId: this.data.senderId, // only send ID
    };

    this.ticketService.createMessage(request).subscribe({
      next: (msg: TicketMessageDto) => {
        console.log('Message sent successfully:', msg);
        this.sending = false;
        this.snackBar.open('Message sent successfully!', 'Close', { duration: 2000 });
        
        // Close dialog with the message data
        setTimeout(() => {
          this.dialogRef.close(msg);
        }, 500);
      },
      error: (err) => {
        console.error('Failed to send message:', err);
        this.sending = false;
        this.snackBar.open('Failed to send message. Please try again.', 'Close', { duration: 3000 });
      },
    });
  }

  loadRecipients(): void {
  if (!this.recipientIds || this.recipientIds.length === 0) return;

  this.employeeService.getSelectedEmployees(this.recipientIds).subscribe({
    next: (employees) => {
      this.employees = employees;

      // Extract emails
      this.recipientEmails = employees
        .map(emp => emp.email)
        .filter(email => !!email);

      console.log('Recipients:', this.recipientEmails);
    },
    error: (err) => {
      console.error('Failed to load recipients', err);
    }
  });
}

  closeDialog(): void {
    this.dialogRef.close();
  }
}



