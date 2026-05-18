import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Subject, of, catchError, takeUntil } from 'rxjs';
import { HelpDeskService } from '../../services/help-desk.services';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { Ticket ,TicketMessageDto, TicketGroup, TicketMessageRequest} from '@/app/core/models/helpdesk.models';
import { Department } from '@/app/core/models/employee.models';
import { InvloveEmployeeDialogComponent } from '../invlove-employee-dialog/invlove-employee-dialog.component';
import { ReplyChatDialogComponent } from '../reply-chat-dialog/reply-chat-dialog.component';
import { AuthService } from '@/app/core/services/auth.service';
import { NotificationService } from '@/app/core/services/notification.service';

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
 templateUrl: './invlovement-ticket-view.component.html',
  styleUrl: './invlovement-ticket-view.component.scss',
})
export class InvlovementTicketViewComponent implements OnInit, OnDestroy {

  ticketId!: string;
  ticket!: Ticket;
  originalTicket!: Ticket;
  loading = false;
  isEditMode = false;
  updating = false;
  currentUserEmail: string = '';
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

  // ── Attachment state (for edit mode) ──────────────────────────────────
  attachedFiles: { file: File; url: string | null; uploading: boolean; error: boolean }[] = [];
  isDragOver = false;
  readonly MAX_FILES = 1;
  readonly MAX_SIZE_MB = 5;
  readonly ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
  readonly ALLOWED_EXT = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];

  ticketTypes = ['Request', 'Complaint', 'Issue'];
  priorities = ['Low', 'Medium', 'High', 'Critical'];
  statuses = ['Open', 'Pending', 'InProgress', 'Resolved', 'Closed'];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private helpDeskService: HelpDeskService,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private dialog: MatDialog,
    private notification: NotificationService
  ) {}

  ngOnInit(): void {
    this.ticketId = this.route.snapshot.paramMap.get('id')!;
    const userInfo = this.getCurrentUserInfo();
    if (userInfo) {
      this.currentUserEmail = userInfo.email.toLowerCase().trim();
    }
    this.loadInitialData();
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
  reloadTicket(): void {
    this.helpDeskService.getTicketById(this.ticketId).pipe(
      catchError(err => {
        console.error('Failed to reload ticket:', err);
        return of(null);
      })
    ).subscribe(ticket => {
      if (ticket) {
        const normalized = this.normalizeTicket(ticket);
        this.ticket = { ...normalized };
        this.originalTicket = { ...normalized };
        this.selectedEmployeeIds = [...(normalized.assignedEmployees || [])];
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
    this.employeeDropdownOpen = false; // Ensure dropdown is closed when entering edit mode
    
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

  openEmployeeDropdown(): void {
    this.employeeDropdownOpen = true;
  }

  closeEmployeeDropdown(): void {
    this.employeeDropdownOpen = false;
    this.employeeFilter = '';
  }

  openInvolveEmployeeDialog(): void {
  const dialogRef = this.dialog.open(InvloveEmployeeDialogComponent, {
    width: '600px',
    autoFocus: false,
    data: {
      ticketId: this.ticketId,
      groupId: this.ticket?.groupId || null,
      
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
      // Reload ticket to get updated data
      this.reloadTicket();
    }
  });
}


openReplyDialog(ticket: Ticket): void {
  const currentUser = this.getCurrentUserInfo();
  if (!currentUser) {
    console.error('No logged-in user found!');
    return;
  }

  // Combine assigned employees with group employees
  let recipientIds = [...(ticket.assignedEmployees || [])];
  
  // Add group employees if group exists
  if (ticket.groupId) {
    const group = this.groups.find(g => g.groupId === ticket.groupId);
    if (group && group.employeeIds) {
      recipientIds = [...new Set([...recipientIds, ...group.employeeIds])];
    }
  }

  const dialogRef = this.dialog.open(ReplyChatDialogComponent, {
    width: '400px',
    data: {
      ticket: ticket,                       // full ticket
      senderId: currentUser.userId,
      senderEmail: currentUser.email,
      recipientIds: recipientIds            // combined assigned + group employees
    }
  });

  dialogRef.afterClosed().subscribe((result) => {
    // result is the TicketMessageDto if message was sent successfully
    if (result) {
      // Always reload messages from server to ensure consistency
      this.loadMessages();
    }
  });
}

  onEmployeeSearch(event: any): void {
    // Filter is already updated via ngModel, no action needed
    // This method can be kept for consistency or removed
  }

  toggleEmployee(emp: { id: string; name: string }): void {
    const current = [...this.selectedEmployeeIds];
    const updated = current.includes(emp.id)
      ? current.filter(id => id !== emp.id)
      : [...current, emp.id];
    this.selectedEmployeeIds = updated;
  }

  isEmployeeSelected(id: string): boolean {
    return this.selectedEmployeeIds.includes(id);
  }

  toggleSelectAll(): void {
    const visible = this.filteredEmployees.map(e => e.id);
    const allSelected = visible.every(id => this.selectedEmployeeIds.includes(id));
    this.selectedEmployeeIds = 
      allSelected
        ? this.selectedEmployeeIds.filter(id => !visible.includes(id))
        : [...new Set([...this.selectedEmployeeIds, ...visible])];
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

  get filteredCategories() {
    return this.categories.filter(cat => cat.status === true);
  }

  getSelectedEmployeeNames(): string {
    if (!this.selectedEmployeeIds.length) return 'N/A';
    return this.selectedEmployeeIds
      .map(id => this.employees.find(e => e.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  }

  getEmployeeNameById(empId: string): string {
    return this.employees.find(e => e.id === empId)?.name || empId;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const insideEmployee = target.closest('[data-dropdown="employee"]');

    if (!insideEmployee && this.employeeDropdownOpen) {
      this.closeEmployeeDropdown();
    }
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
        this.notification.showSuccess('Ticket updated successfully');
        this.updating = false;
        this.isEditMode = false;
        this.loadInitialData();
      },
      error: err => {
        console.error('Error updating ticket:', err);
        this.notification.showError(err?.message || 'Failed to update ticket');
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
  if (!this.replyText?.trim()) return;

  const currentUser = this.getCurrentUserInfo();
  if (!currentUser) {
    this.notification.showError('User not authenticated');
    return;
  }

  // Combine assigned employees with group employees
  let recipientIds = [...(this.ticket?.assignedEmployees || [])];
  
  // Add group employees if group exists
  if (this.ticket?.groupId) {
    const group = this.groups.find(g => g.groupId === this.ticket?.groupId);
    if (group && group.employeeIds) {
      recipientIds = [...new Set([...recipientIds, ...group.employeeIds])];
    }
  }

  // Exclude sender from recipients
  recipientIds = recipientIds.filter(id => id !== currentUser.userId);

  if (recipientIds.length === 0) {
    this.notification.showWarning('No recipients found');
    return;
  }

  this.sendingMessage = true;

  const request: TicketMessageRequest = {
    ticketId: this.ticketId,
    message: this.replyText,
    messageType: 'chat',
    subject: this.ticket?.ticketTitle || undefined,
    recipientIds: recipientIds,
    senderId: currentUser.userId
  };

  this.helpDeskService.createMessage(request).subscribe({
    next: (msg: TicketMessageDto) => {
      console.log('Message sent successfully:', msg);
      this.sendingMessage = false;
      this.messages.push(msg);
      this.replyText = '';
      this.notification.showSuccess('Message sent successfully');
     this.loadMessages();
    },
    error: (err) => {
      console.error('Failed to send message:', err);
      this.sendingMessage = false;
      this.notification.showError(err?.message || 'Failed to send message');
    }
  });
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

  // Display file preview - open all files in new tab
  showFilePrev(fileUrl?: string): void {
    const url = fileUrl || this.ticket?.attachment || '';
    
    if (!url) {
      console.warn('No file URL available');
      return;
    }

    try {
      console.log('Opening file in new tab:', url);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error opening file:', error);
      alert('Unable to open file. Please try downloading it directly.');
    }
  }

  // Remove attachment (edit mode only)
  removeAttachment(): void {
    if (!this.isEditMode) return;
    this.ticket.attachment = '';
  }

  // ── Drag & Drop handlers ──────────────────────────────────────────────────
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const files = Array.from(event.dataTransfer?.files ?? []);
    this.processFiles(files);
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.processFiles(files);
    input.value = ''; // reset so same file can be re-selected
  }

  // ── File processing ───────────────────────────────────────────────────────
  private processFiles(files: File[]): void {
    for (const file of files) {
      if (this.attachedFiles.length >= this.MAX_FILES) break;
      if (!this.isValidFile(file)) continue;
      const entry = { file, url: null, uploading: true, error: false };
      this.attachedFiles.push(entry);
      this.uploadFile(entry);
    }
  }

  private isValidFile(file: File): boolean {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      alert('Invalid file type. Allowed: PDF, DOCX, JPG, PNG');
      return false;
    }
    if (file.size > this.MAX_SIZE_MB * 1024 * 1024) {
      alert(`File size exceeds ${this.MAX_SIZE_MB}MB limit`);
      return false;
    }
    if (this.attachedFiles.some(f => f.file.name === file.name && f.file.size === file.size)) {
      alert('This file is already attached');
      return false;
    }
    return true;
  }

  private uploadFile(entry: { file: File; url: string | null; uploading: boolean; error: boolean }): void {
    this.helpDeskService.uploadattachments(entry.file).subscribe({
      next: (url: string) => {
        entry.url = url;
        entry.uploading = false;
        // Update ticket attachment with new URL
        this.ticket.attachment = url;
        console.log('File uploaded successfully:', url);
      },
      error: (err) => {
        entry.uploading = false;
        entry.error = true;
        console.error('File upload failed:', err);
      }
    });
  }

  removeFile(index: number): void {
    this.attachedFiles.splice(index, 1);
    // If all files removed, clear attachment
    if (this.attachedFiles.length === 0) {
      this.ticket.attachment = '';
    }
  }

  retryUpload(index: number): void {
    const entry = this.attachedFiles[index];
    entry.error = false;
    entry.uploading = true;
    this.uploadFile(entry);
  }

  getFileIcon(file: File): string {
    if (file.type === 'application/pdf') return 'picture_as_pdf';
    if (file.type.startsWith('image/')) return 'image';
    return 'description';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  get canAddMore(): boolean {
    return this.attachedFiles.length < this.MAX_FILES;
  }

  get hasUploading(): boolean {
    return this.attachedFiles.some(f => f.uploading);
  }
   
   hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Help Desk', 'Tickets Dashboard', actionKey);
  }

}