import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Subject, of, catchError, takeUntil } from 'rxjs';
import { HelpDeskService } from '../../services/help-desk.services';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { Ticket ,TicketMessageDto, TicketGroup} from '@/app/core/models/helpdesk.models';
import { Department } from '@/app/core/models/employee.models';
import { InvloveEmployeeDialogComponent } from '../invlove-employee-dialog/invlove-employee-dialog.component';
import { ReplyChatDialogComponent } from '../reply-chat-dialog/reply-chat-dialog.component';
import { AuthService } from '@/app/core/services/auth.service';

interface CategoryDto {
  categoryId: string;
  organizationId: string;
  departmentId: string;
  departmentName: string;
  categoryName: string;
  status: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-view-ticket-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
  ],
  templateUrl: './view-ticket-details.component.html',
  styleUrls: ['./view-ticket-details.component.scss'],
})
export class ViewTicketDetailsComponent implements OnInit, OnDestroy {

  ticketId!: string;
  ticket!: Ticket;
  originalTicket!: Ticket;
  loading = false;
  isEditMode = false;
  updating = false;
messages: TicketMessageDto[] = [];
newMessage: string = '';
sendingMessage = false;
  departments: Department[] = [];
  categories: CategoryDto[] = [];
  groups: TicketGroup[] = [];
  employees: { id: string; name: string; code?: string }[] = [];

  employeeDropdownOpen = false;
  employeeFilter = '';
  selectedEmployeeIds: string[] = [];
  replyText: string = '';

  ticketTypes = ['Request', 'Complaint', 'Issue'];
  priorities = ['Low', 'Medium', 'High', 'Critical'];
  statuses = ['Open', 'Pending', 'InProgress', 'Resolved', 'Closed'];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private helpDeskService: HelpDeskService,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.ticketId = this.route.snapshot.paramMap.get('id')!;
    this.loadInitialData();
    // this.getCurrentUserInfo();
    this.loadMessages(); // Load messages when component initializes
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // -----------------------------
  // LOAD INITIAL DATA
  // -----------------------------
  loadInitialData(): void {
    this.loading = true;

    // Load Departments
    this.employeeService.getDepartments().pipe(
      catchError(err => {
        console.error('Failed to load departments:', err);
        return of([]);
      })
    ).subscribe(departments => this.departments = departments || []);

    // Load Categories
    this.helpDeskService.getCategories({ searchTerm: '' }).pipe(
      catchError(err => {
        console.error('Failed to load categories:', err);
        return of([]);
      })
    ).subscribe((res: any) => {
      this.categories = res || [];
      console.log('Categories loaded:', this.categories);
    });

    // Load Employees
    this.employeeService.getEmployees().pipe(
      catchError(err => {
        console.error('Failed to load employees:', err);
        return of([]);
      })
    ).subscribe((res: any) => {
      const list = res?.employees || res || [];
      this.employees = list.map((e: any) => ({
        id: String(e.employeeId),
        name: e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim(),
        code: e.employeeCode || ''
      }));
    });

    // Load Groups (all groups initially)
    this.loadGroups();

    // Load Ticket
    this.helpDeskService.getTicketById(this.ticketId).pipe(
      catchError(err => {
        console.error('Failed to load ticket:', err);
        return of(null);
      })
    ).subscribe(ticket => {
      if (ticket) {
        const normalized = this.normalizeTicket(ticket);
        this.ticket = { ...normalized };
        this.originalTicket = { ...normalized };
        this.selectedEmployeeIds = [...(normalized.assignedEmployees || [])];
      }
      this.loading = false;
    });
  }

  loadGroups(categoryId?: string): void {
    this.helpDeskService.getAllGroups('', categoryId).pipe(
      catchError(err => {
        console.error('Failed to load groups:', err);
        return of({ data: [] });
      })
    ).subscribe((res: any) => {
      const groups = res?.data || res || [];
      this.groups = groups.map((g: any) => ({
        groupId: String(g.groupId ?? g.id ?? ''),
        groupTitle: g.groupTitle || g.name || '',
        employeeIds: g.employeeIds || [],
        departmentId: g.departmentId || null,
        departmentName: g.departmentName || null,
        categoryId: g.categoryId || null,
        categoryName: g.categoryName || null,
        createdAt: g.createdAt || '',
        employeeNames: g.employeeNames || []
      } as TicketGroup));
      console.log('Groups loaded:', this.groups);
    });
  }
loadMessages(): void {
  if (!this.ticketId) return;

  this.helpDeskService.getMessagesByTicket(this.ticketId).subscribe({
    next: (res) => {
      this.messages = res || [];

    },
    error: (err) => {
      console.error('Failed to load messages:', err);
    }
  });
}

//Get Current User Info for Message Sender 
getCurrentUserInfo(): { userId: string; email: string } | null {
  const user = this.authService.getCurrentUserValue();
  if (!user) return null;

  return {
    userId: user.userId,       // adjust according to your user model
    email: user.email || '' // fallback if email missing
  };
}


  // -----------------------------
  // NORMALIZE TICKET DATA
  // -----------------------------
  private normalizeTicket(raw: any): Ticket {
    const t: any = raw || {};
    const assigned = t.assignedEmployees || t.assignedEmployeeIds || t.assigned_employee_ids || [];
    const groupId = t.groupId ?? t.group_id ?? t.group?.groupId ?? t.group?.id ?? null;
    const groupEmployeeNames = t.groupEmployeeNames || t.group?.employeeNames || t.group?.groupEmployeeNames || [];
    const categoryId = t.categoryId ?? t.category_id ?? t.category ?? null;

    return {
      ticketid: t.ticketid || t.ticketId || t.id || '',
      departmentId: t.departmentId || t.department_id || null,
      departmentName: t.departmentName || t.department_name || t.department || '',
      ticketTitle: t.ticketTitle || t.title || '',
      ticketType: this.normalizeTicketType(t.ticketType || t.ticket_type || ''),
      category: categoryId || '',
      groupName: t.groupName || t.groupTitle || t.group?.groupTitle || t.group?.name || '',
      groupEmployeeNames: Array.isArray(groupEmployeeNames) ? groupEmployeeNames : [],
      groupId: groupId == null ? '' : String(groupId),
      assignedEmployees: Array.isArray(assigned) ? assigned.map(String) : [],
      assignedEmployeeNames: t.assignedEmployeeNames || t.assigned_employee_names || [],
      priority: t.priority || '',
      createdat: t.createdat || t.createdAt || '',
      description: t.description || '',
      attachment: t.attachment || '',
      status: t.status || '',
      createdByName: t.createdByName || t.created_by || t.createdBy || ''
    } as Ticket;
  }

  private normalizeTicketType(type: string): string {
    const val = (type || '').toLowerCase().trim();
    if (val.includes('request')) return 'Request';
    if (val.includes('complaint')) return 'Complaint';
    if (val.includes('issue')) return 'Issue';
    return '';
  }

  // -----------------------------
  // EDIT MODE
  // -----------------------------
  enableEditMode(): void {
    this.isEditMode = true;
    this.patchTicketForEdit();
  }

  private patchTicketForEdit(): void {
    this.ticket = { ...this.originalTicket };
    this.ticket.groupId = this.ticket.groupId == null ? '' : String(this.ticket.groupId);
    this.selectedEmployeeIds = [...(this.originalTicket.assignedEmployees || [])];
    
    // Subscribe to category changes to reload groups
    // Note: You may need to add a FormControl for category in template
    // For now, reload groups based on the ticket's category if available
    if (this.ticket.category) {
      this.loadGroups(this.ticket.category);
    }
  }

  cancelEdit(): void {
    this.isEditMode = false;
    this.employeeDropdownOpen = false;
    this.employeeFilter = '';
    this.ticket = { ...this.originalTicket };
    this.selectedEmployeeIds = [...(this.originalTicket.assignedEmployees || [])];
  }

  // -----------------------------
  // EMPLOYEE DROPDOWN HELPERS
  // -----------------------------
  toggleEmployeeDropdown(event?: MouseEvent): void {
    event?.stopPropagation();
    this.employeeDropdownOpen = !this.employeeDropdownOpen;
    if (!this.employeeDropdownOpen) this.employeeFilter = '';
  }

  openInvolveEmployeeDialog(): void {
  const dialogRef = this.dialog.open(InvloveEmployeeDialogComponent, {
    width: '600px',
    data: {
      ticketId: this.ticketId,
      groupId: this.ticket?.groupId || null
    } // passing ticketId and optional groupId
    
  });

  dialogRef.afterClosed().subscribe((result) => {
    if (result) {
      // result expected: { assignedEmployees?: string[] | null, groupId?: string | null }
      console.log('Involve dialog result:', result);
      if (Array.isArray(result)) {
        this.selectedEmployeeIds = result;
      } else if (result.assignedEmployees) {
        this.selectedEmployeeIds = result.assignedEmployees as string[];
      }
      if (result.groupId !== undefined && result.groupId !== null) {
        this.ticket = this.ticket || {} as any;
        this.ticket.groupId = result.groupId;
      }
      // call update to persist changes
      // this.updateTicket();
    }
  });
}


openReplyDialog(ticket: Ticket): void {
  const currentUser = this.getCurrentUserInfo();
  if (!currentUser) {
    console.error('No logged-in user found!');
    return;
  }

  const dialogRef = this.dialog.open(ReplyChatDialogComponent, {
    width: '400px',
    data: {
      ticket: ticket,                       // full ticket
      senderId: currentUser.userId,
      senderEmail: currentUser.email
    }
  });

  dialogRef.afterClosed().subscribe((result) => {
    // result is the TicketMessageDto if message was sent successfully
    if (result) {
      console.log('Dialog closed with result:', result);
      if (result.messageId) {
        console.log('Message sent successfully:', result);
        // Add the new message to the messages array
        this.messages.push(result);
      }
      // Always reload messages from server to ensure consistency
      this.loadMessages();
    }
  });
}

  closeEmployeeDropdown(): void {
    this.employeeDropdownOpen = false;
    this.employeeFilter = '';
  }

  onEmployeeSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.employeeFilter = input.value;
  }

  toggleEmployee(emp: { id: string; name: string }): void {
    const index = this.selectedEmployeeIds.indexOf(emp.id);
    if (index > -1) this.selectedEmployeeIds.splice(index, 1);
    else this.selectedEmployeeIds.push(emp.id);
  }

  isEmployeeSelected(id: string): boolean {
    return this.selectedEmployeeIds.includes(id);
  }

  toggleSelectAll(): void {
    const visible = this.filteredEmployees.map(e => e.id);
    const allSelected = visible.every(id => this.selectedEmployeeIds.includes(id));
    if (allSelected) this.selectedEmployeeIds = this.selectedEmployeeIds.filter(id => !visible.includes(id));
    else this.selectedEmployeeIds = [...new Set([...this.selectedEmployeeIds, ...visible])];
  }

  isAllVisibleSelected(): boolean {
    const visible = this.filteredEmployees;
    return visible.length > 0 && visible.every(e => this.selectedEmployeeIds.includes(e.id));
  }

  get filteredEmployees() {
    const q = this.employeeFilter.toLowerCase().trim();
    return !q ? this.employees : this.employees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.code || '').toLowerCase().includes(q)
    );
  }

  getSelectedEmployeeNames(): string {
    if (!this.selectedEmployeeIds.length) return 'N/A';
    return this.selectedEmployeeIds
      .map(id => this.employees.find(e => e.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.employeeDropdownOpen) return;
    const target = event.target as HTMLElement;
    const inside = target.closest('.cg-search-row') || target.closest('.cg-checklist-box');
    if (!inside) this.closeEmployeeDropdown();
  }

  // -----------------------------
  // UPDATE TICKET
  // -----------------------------
  updateTicket(): void {
    if (!this.ticket) return;

    this.updating = true;
    const updateRequest = {
      ticketId: this.ticketId,
      departmentId: this.ticket.departmentId,
      ticketTitle: this.ticket.ticketTitle,
      ticketType: this.ticket.ticketType,
      categoryId: this.ticket.category,
      groupId: this.ticket.groupId || null,
      assignedEmployees: this.selectedEmployeeIds,
      priority: this.ticket.priority,
      description: this.ticket.description,
      attachment: this.ticket.attachment,
      status: this.ticket.status
    };

    this.helpDeskService.updateTicket(updateRequest).subscribe({
      next: () => {
        alert('Ticket updated successfully!');
        this.updating = false;
        this.isEditMode = false;
        this.loadInitialData();
      },
      error: err => {
        console.error('Error updating ticket:', err);
        alert('Failed to update ticket.');
        this.updating = false;
      }
    });
  }
  // -----------------------------
// REPLY COMPOSER METHODS
// -----------------------------
scrollToReply(): void {
  console.log('scrollToReply: soon implemented');
  const el = document.getElementById('reply-composer');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

cancelReply(): void {
  console.log('cancelReply: soon implemented');
  this.replyText = '';
}

sendReply(): void {
  console.log('sendReply: soon implemented');
  if (!this.replyText?.trim()) return;

  // stub: just push to messages for now
  const newMsg: TicketMessageDto = {
    messageId: 'temp-' + Date.now(),
    ticketId: this.ticketId,
    senderId: 'current-user', // replace with actual user id later
    senderFullName: 'You',
    senderEmail: 'you@example.com',
    message: this.replyText,
    messageType: 'chat',
    subject: this.ticket?.ticketTitle || '',
    createdAt: new Date().toISOString()
  };
  this.messages.push(newMsg);
  this.replyText = '';
}

  // Update groups when category selection changes in edit mode
  onCategoryChange(categoryId: string): void {
    if (this.isEditMode) {
      this.loadGroups(categoryId);
      this.ticket = this.ticket || {} as Ticket;
      this.ticket.groupId = ''; // Reset group selection when category changes
    }
  }

  getGroupName(id: string | null): string {
    return this.groups.find(g => g.groupId === String(id))?.groupTitle || 'N/A';
  }

  // Get category name by id
  getCategoryName(id: string | null): string {
    return this.categories.find(c => c.categoryId === String(id))?.categoryName || 'N/A';
  }

}