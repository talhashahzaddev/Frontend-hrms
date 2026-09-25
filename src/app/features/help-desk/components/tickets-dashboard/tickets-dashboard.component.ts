import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { SharedCommonModule } from '@shared/shared-common.module';
// tickets-dashboard.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';
import { HelpDeskService } from '../../services/help-desk.services';
import { Ticket, TicketSearch } from '@/app/core/models/helpdesk.models';
import { Department } from '@/app/core/models/employee.models';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import {Subject,combineLatest,debounceTime,distinctUntilChanged,startWith,takeUntil}from 'rxjs';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NotificationService } from '@/app/core/services/notification.service';
import { CreateTicketDialogueComponent } from '../create-ticket-dialogue/create-ticket-dialogue.component';
import { AuthService } from '@/app/core/services/auth.service';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from '@/app/shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-tickets-dashboard',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule
    ,MatProgressSpinnerModule, PageHeaderComponent
  ],
  templateUrl: './tickets-dashboard.component.html',
  styleUrl: './tickets-dashboard.component.scss'
})
export class TicketsDashboardComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  tickets: Ticket[] = [];
  departments: Department[] = [];
  loading = false;

  // Filters
  searchControl = new FormControl('');
  departmentControl = new FormControl('');
  statusControl = new FormControl('');
  ticketTypeControl = new FormControl('');

  searchModel: TicketSearch = {
    page: 1,
    pageSize: 10,
    sortOrder: 'asc'
  };

  constructor(
    private helpDeskService: HelpDeskService,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private router:Router,
    private dialog: MatDialog,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.setupSearch();
    this.getTickets();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    combineLatest([
      this.searchControl.valueChanges.pipe(startWith('')),
      this.departmentControl.valueChanges.pipe(startWith('')),
      this.statusControl.valueChanges.pipe(startWith('')),
      this.ticketTypeControl.valueChanges.pipe(startWith(''))
    ])
    .pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    )
    .subscribe(([search, dept, status, ticketType]) => {
      this.searchModel.searchTerm = search || undefined;
      this.searchModel.departmentId = dept || undefined;
      this.searchModel.status = status || undefined;

      this.searchModel.page = 1;
      this.getTickets();
    });
  }

  loadDepartments(): void {
    this.employeeService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => this.departments = res || [],
        error: err => console.error(err)
      });
  }

  getTickets(): void {
    this.loading = true;

    this.helpDeskService.getAllTickets(this.searchModel)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.tickets = (res || []);
          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.loading = false;
        }
      });
  }

  openCreateTicketDialog(): void {
    const dialogRef = this.dialog.open(CreateTicketDialogueComponent, {
      width: '700px',
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) this.getTickets();
    });
  }

  viewTicket(ticket: Ticket): void {
    console.log('CLICK WORKING', ticket.ticketid);
    this.router.navigate(['help-desk/tickets/view', ticket.ticketid]);
  }


  deleteTicket(ticket: Ticket): void {
    const confirmButtonText = 'Yes, Delete';
    const dialogData: ConfirmDeleteData = {
      title: 'Delete Ticket',
      message: 'Are you sure you want to delete this ticket?',
      itemName: ticket.ticketTitle,
      confirmButtonText
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: dialogData,
      panelClass: 'confirm-delete-dialog-panel'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.loading = true;

        this.helpDeskService.deleteTicket(ticket.ticketid)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (res) => {
              if (res) {
                // Remove ticket from list
                this.tickets = this.tickets.filter(t => t.ticketid !== ticket.ticketid);
                this.notification.showSuccess('Ticket deleted successfully');
              }
              this.loading = false;
            },
            error: (err) => {
              console.error('Delete error:', err);
              this.notification.showError(err?.message || 'Failed to delete ticket');
              this.loading = false;
            }
          });
      }
    });
  }
  hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Help Desk', 'Tickets Dashboard', actionKey);
  }


}

