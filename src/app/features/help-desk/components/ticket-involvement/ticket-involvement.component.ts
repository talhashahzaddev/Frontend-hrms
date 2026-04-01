import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Subject, combineLatest, debounceTime, startWith, takeUntil } from 'rxjs';
import { Router } from '@angular/router';

import { HelpDeskService } from '../../services/help-desk.services';
import { EmployeeService } from '@/app/features/employee/services/employee.service';

import { Ticket, TicketSearch } from '@/app/core/models/helpdesk.models';
import { Department } from '@/app/core/models/employee.models';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-ticket-involvement',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './ticket-involvement.component.html',
  styleUrl: './ticket-involvement.component.scss',
})
export class TicketInvolvementComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  tickets: Ticket[] = [];
  departments: Department[] = [];
  loading = false;

  // ✅ Filters
  searchControl = new FormControl('');
  departmentControl = new FormControl('');
  statusControl = new FormControl('');

  // ✅ Search Model (matches backend)
  searchModel: TicketSearch = {
    page: 1,
    pageSize: 10,
    sortOrder: 'asc'
  };

  constructor(
    private helpDeskService: HelpDeskService,
    private employeeService: EmployeeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDepartments();
    this.setupSearch();
    this.getAssignedTickets();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ Reactive search
  private setupSearch(): void {
    combineLatest([
      this.searchControl.valueChanges.pipe(startWith('')),
      this.departmentControl.valueChanges.pipe(startWith('')),
      this.statusControl.valueChanges.pipe(startWith(''))
    ])
    .pipe(
      debounceTime(300),
      takeUntil(this.destroy$)
    )
    .subscribe(([search, dept, status]) => {
      this.searchModel.searchTerm = search || undefined;
      this.searchModel.departmentId = dept || undefined;
      this.searchModel.status = status || undefined;

      this.searchModel.page = 1;

      this.getAssignedTickets();
    });
  }

  // ✅ Load departments
  loadDepartments(): void {
    this.employeeService.getDepartments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => this.departments = res || [],
        error: err => console.error(err)
      });
  }

  // ✅ MAIN API CALL (your backend)
  getAssignedTickets(): void {
    this.loading = true;

    this.helpDeskService.getAssignedTickets(this.searchModel)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const data = res?.data || [];

          this.tickets = data;

          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.loading = false;
        }
      });
  }

  // ✅ Actions
  viewTicket(ticket: Ticket): void {
    console.log('CLICK WORKING', ticket.ticketid);
    this.router.navigate(['help-desk/tickets/view', ticket.ticketid]);
  }

  deleteTicket(ticket: Ticket): void {
    if (confirm(`Delete "${ticket.ticketTitle}"?`)) {
      console.log('Delete:', ticket);
    }
  }
}