import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Subject, takeUntil } from 'rxjs';
import { HelpDeskService } from '../../services/help-desk.services';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { TicketGroup } from '@/app/core/models/helpdesk.models';
import { NotificationService } from '@/app/core/services/notification.service';
interface Category {
  categoryId: string;
  departmentId: string;
  departmentName: string;
  categoryName: string;
  status: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-create-ticket-dialogue',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './create-ticket-dialogue.component.html',
  styleUrl: './create-ticket-dialogue.component.scss',
})
export class CreateTicketDialogueComponent implements OnInit, OnDestroy {

  ticketForm!: FormGroup;

  departments: any[] = [];
  categories: Category[] = [];
  groups: TicketGroup[] = [];

  ticketTypes = ['Request', 'Complaint', 'Issue'];
  priorities = ['High', 'Medium', 'Low'];

  loading = false;

  // ── Attachment state ──────────────────────────────────────────────────────
  attachedFiles: { file: File; url: string | null; uploading: boolean; error: boolean }[] = [];
  isDragOver = false;
  readonly MAX_FILES = 3;
  readonly MAX_SIZE_MB = 5;
  readonly ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
  readonly ALLOWED_EXT = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private helpDeskService: HelpDeskService,
    private employeeService: EmployeeService,
    private notificationService: NotificationService,
    private dialogRef: MatDialogRef<CreateTicketDialogueComponent>
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadDepartments();
    this.loadCategories();
    this.loadGroups();

    // Reload groups when category changes
    this.ticketForm.get('categoryId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((categoryId) => {
        this.loadGroups(categoryId);
        this.ticketForm.patchValue({ assignedGroup: null }); // Reset group selection
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeForm(): void {
    this.ticketForm = this.fb.group({
      departmentId:  [null, Validators.required],
      ticketTitle:   ['',   Validators.required],
      ticketType:    ['',   Validators.required],
      categoryId:    [null, Validators.required],
      assignedGroup: [null, Validators.required],
      priority:      ['',   Validators.required],
      description:   [''],
      attachment: [null]
    });
  }

  loadDepartments(): void {
    this.employeeService.getDepartments().subscribe({
      next:  (res) => { this.departments = res; },
      error: (err) => { console.error('Failed to load departments', err); }
    });
  }

  loadCategories(): void {
    this.helpDeskService.getCategories({ searchTerm: '' }).subscribe({
      next:  (res: Category[]) => { 
        this.categories = (res || []).filter(cat => cat.status === true); 
        console.log('Categories loaded:', this.categories);
      },
      error: (err) => { console.error('Failed to load categories', err); }
    });
  }

  loadGroups(categoryId?: string): void {
    this.helpDeskService.getAllGroups('', categoryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.groups = (res?.data || []).map((group: any) => ({
            ...group,
            employeeNames: group.employeeNames
              ? group.employeeNames.split(',').map((name: string) => name.trim())
              : []
          }));
          console.log('Groups loaded:', this.groups);
        },
        error: (err) => { console.error('Failed to load groups', err); }
      });
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
    if (!this.ALLOWED_TYPES.includes(file.type)) return false;
    if (file.size > this.MAX_SIZE_MB * 1024 * 1024) return false;
    if (this.attachedFiles.some(f => f.file.name === file.name && f.file.size === file.size)) return false;
    return true;
  }
  private uploadFile(entry: { file: File; url: string | null; uploading: boolean; error: boolean }): void {
  this.helpDeskService.uploadattachments(entry.file).subscribe({
    next: (url: string) => {
      entry.url = url;
      entry.uploading = false;

      // ✅ 🔥 THIS LINE WAS MISSING
      this.ticketForm.patchValue({ attachment: url });
    },
    error: () => {
      entry.uploading = false;
      entry.error = true;
    }
  });
}

  removeFile(index: number): void {
    this.attachedFiles.splice(index, 1);
  }

  retryUpload(index: number): void {
    const entry = this.attachedFiles[index];
    entry.error     = false;
    entry.uploading = true;
    this.uploadFile(entry);
  }

  getFileIcon(file: File): string {
    if (file.type === 'application/pdf')  return 'picture_as_pdf';
    if (file.type.startsWith('image/'))   return 'image';
    return 'description';
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024)        return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  get canAddMore(): boolean {
    return this.attachedFiles.length < this.MAX_FILES;
  }

  get hasUploading(): boolean {
    return this.attachedFiles.some(f => f.uploading);
  }

  submit(): void {
  if (this.ticketForm.invalid) {
    this.ticketForm.markAllAsTouched();
    return;
  }

  this.loading = true;

  const payload = { ...this.ticketForm.value };

  if (!payload.assignedGroup) {
    payload.assignedGroup = null;
  }

  console.log('Final Payload:', payload);

  this.helpDeskService.createTicket(payload).subscribe({
    next: () => {
      this.loading = false;
      this.notificationService.showSuccess('Ticket created successfully');
      this.dialogRef.close(true);
    },
    error: (err) => {
      this.loading = false;
      this.notificationService.showError(err?.message || 'Failed to create ticket');
      console.error('Failed to create ticket', err);
    }
  });
}

  cancel(): void {
    this.dialogRef.close(false);
  }
}