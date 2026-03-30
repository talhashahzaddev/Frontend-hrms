// tickets-dashboard.component.ts

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
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
import { CreateTicketDialogueComponent } from '../create-ticket-dialogue/create-ticket-dialogue.component';

interface TicketWithMenu extends Ticket {
  _menuOpen?: boolean;
}

@Component({
  selector: 'app-tickets-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule
  ],
  templateUrl: './tickets-dashboard.component.html',
  styleUrl: './tickets-dashboard.component.scss'
})
export class TicketsDashboardComponent implements OnInit, OnDestroy {

  private destroy$ = new Subject<void>();

  tickets: TicketWithMenu[] = [];
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
    private router:Router,
    private dialog: MatDialog
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

  // ✅ CLOSE MENU ON OUTSIDE CLICK
  @HostListener('document:click')
  closeAllMenus(): void {
    this.tickets.forEach(t => t._menuOpen = false);
  }

  // ✅ TOGGLE ONLY ONE MENU
  toggleMenu(ticket: TicketWithMenu, event: Event): void {
    event.stopPropagation();

    this.tickets.forEach(t => {
      if (t !== ticket) t._menuOpen = false;
    });

    ticket._menuOpen = !ticket._menuOpen;
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
          this.tickets = (res || []).map((t: Ticket) => ({
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

  openCreateTicketDialog(): void {
    const dialogRef = this.dialog.open(CreateTicketDialogueComponent, {
      width: '700px',
      maxWidth: '95vw'
    });

    dialogRef.afterClosed().subscribe(res => {
      if (res) this.getTickets();
    });
  }

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