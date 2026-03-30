import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
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

interface TicketWithMenu extends Ticket {
  _menuOpen?: boolean;
}

@Component({
  selector: 'app-ticket-involvement',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule
  ],
  templateUrl: './ticket-involvement.component.html',
  styleUrl: './ticket-involvement.component.scss',
})
export class TicketInvolvementComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  tickets: TicketWithMenu[] = [];
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

  // ✅ Close menu on outside click
  @HostListener('document:click')
  closeAllMenus(): void {
    this.tickets.forEach(t => t._menuOpen = false);
  }

  // ✅ Toggle menu
  toggleMenu(ticket: TicketWithMenu, event: Event): void {
    event.stopPropagation();

    this.tickets.forEach(t => {
      if (t !== ticket) t._menuOpen = false;
    });

    ticket._menuOpen = !ticket._menuOpen;
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

          this.tickets = data.map((t: Ticket) => ({
            ...t,
            _menuOpen: false
          }));

          this.loading = false;
        },
        error: err => {
          console.error(err);
          this.loading = false;
        }
      });
  }

  // ✅ Actions
  viewTicket(ticket: TicketWithMenu): void {
    console.log('CLICK WORKING', ticket.ticketid);
    ticket._menuOpen = false;
    this.router.navigate(['help-desk/tickets/view', ticket.ticketid]);
  }

  deleteTicket(ticket: TicketWithMenu): void {
    if (confirm(`Delete "${ticket.ticketTitle}"?`)) {
      console.log('Delete:', ticket);
      ticket._menuOpen = false;
    }
  }
}