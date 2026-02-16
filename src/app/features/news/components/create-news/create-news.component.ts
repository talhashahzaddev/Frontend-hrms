import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { NewsDto, NewsRequest } from '@/app/core/models/news.models';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { Employee } from '@/app/core/models/employee.models';
import { PerformanceService } from '@/app/features/performance/services/performance.service';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '@/app/core/services/notification.service';
import { NewsService } from '../../services/news.services';

@Component({
  selector: 'app-create-news',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './create-news.component.html',
  styleUrls: ['./create-news.component.scss']
})
export class CreateNewsComponent {
  newsForm: FormGroup;
  isSubmitting = false;
  employees: Employee[] = [];
  isManager = false;
  private destroy$ = new Subject<void>();
  imagePreview: string | null = null;
  isUploadingImage = false;
  imageFileName: string | null = null;


  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private performanceService: PerformanceService,
    private notification: NotificationService,
    private newsService: NewsService,
    private dialogRef: MatDialogRef<CreateNewsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { isEditMode: boolean, news?: NewsDto }
  ) {
    this.newsForm = this.fb.group({
      title: [data.news?.title || '', Validators.required],
      description: [data.news?.description || '', Validators.required],
      category: [data.news?.category || '', Validators.required],
      imageUrl: [data.news?.imageUrl || ''], // will store URL string
      status: [data.news?.status || 'Draft', Validators.required],
      visibleTo: [data.news?.visibleTo || 'Everyone', Validators.required],
      selectedEmployees: [data.news?.selectedEmployees || []]
    });
  }
  ngOnInit() {
    this.loadEmployees();
    // Show existing image in edit mode
    if (this.data.isEditMode && this.data.news?.imageUrl) {
      this.imagePreview = this.data.news.imageUrl;
    }
  }

  private loadEmployees(): void {
    if (this.isManager) {
      // Load only team employees for managers
      this.performanceService.getMyTeamEmployees()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res.success && res.data) {
              // Map the response to Employee format
              this.employees = res.data.map((emp: any) => ({
                employeeId: emp.employeeId ? (typeof emp.employeeId === 'string' ? emp.employeeId : emp.employeeId.toString()) : '',
                organizationId: '',
                employeeCode: emp.employeeCode || '',
                employeeNumber: emp.employeeCode || '',
                firstName: emp.firstName || '',
                lastName: emp.lastName || '',
                fullName: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
                email: emp.email || '',
                phone: emp.phone,
                hireDate: emp.hireDate ? (typeof emp.hireDate === 'string' ? emp.hireDate : new Date(emp.hireDate).toISOString().split('T')[0]) : '',
                status: emp.status || 'active',
                profilePictureUrl: emp.profilePictureUrl || '',
                createdAt: '',
                updatedAt: '',
                workLocation: '',
                basicSalary: 0
              }));
            } else {
              this.employees = [];
            }
          },
          error: () => this.notification.showError('Failed to load team employees')
        });
    } else {
      // Load all employees for Admin/HR
      this.employeeService.getEmployees()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            this.employees = res.employees || [];
          },
          error: () => this.notification.showError('Failed to load employees')
        });
    }
  }

  onSubmit() {
    if (this.newsForm.invalid) return;
    if (this.data.isEditMode) {
      this.updateNews();
    } else {
      this.isSubmitting = true;
      const formValue = this.newsForm.value;
      // Send imageUrl as string (already uploaded)
      const request: any = {
        title: formValue.title,
        description: formValue.description,
        category: formValue.category,
        status: formValue.status,
        visibleTo: formValue.visibleTo,
        selectedEmployees: formValue.selectedEmployees || [],
        imageUrl: formValue.imageUrl || ''
      };
      this.newsService.createNews(request).subscribe({
        next: (news) => {
          this.notification.showSuccess('News created successfully');
          this.isSubmitting = false;
          this.dialogRef.close(news);
        },
        error: (err) => {
          this.notification.showError(err?.message || 'Failed to create news');
          this.isSubmitting = false;
        }
      });
    }
  }

  //update news
  private updateNews(): void {
    if (!this.data.news) return;
    this.isSubmitting = true;
    const formValue = this.newsForm.value;
    const request: any = {
      title: formValue.title,
      description: formValue.description,
      category: formValue.category,
      status: formValue.status,
      visibleTo: formValue.visibleTo,
      selectedEmployees: formValue.selectedEmployees || [],
      imageUrl: formValue.imageUrl || this.data.news?.imageUrl || ''
    };
    this.newsService.editNews(this.data.news.newsId!, request).subscribe({
      next: () => {
        this.notification.showSuccess('News updated successfully');
        this.isSubmitting = false;
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.notification.showError(err?.message || 'Failed to update news');
        this.isSubmitting = false;
      }
    });
  }



  onFileChange(event: Event, input?: HTMLInputElement) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    // Validate file type/size (optional: add more checks)
    this.isUploadingImage = true;
    this.imageFileName = file.name;
    // Show preview
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
    };
    reader.readAsDataURL(file);
    // Upload to server
    this.newsService.uploadReceipt(file).subscribe({
      next: (url: string) => {
        this.newsForm.patchValue({ imageUrl: url });
        this.isUploadingImage = false;
        this.notification.showSuccess('Image uploaded');
      },
      error: (err: any) => {
        this.notification.showError(err?.message || 'Image upload failed');
        this.isUploadingImage = false;
        this.imagePreview = null;
        this.newsForm.patchValue({ imageUrl: '' });
        this.imageFileName = null;
      }
    });
    if (input) input.value = '';
  }

  clearImage(): void {
    this.newsForm.patchValue({ imageUrl: '' });
    this.imagePreview = null;
    this.imageFileName = null;
  }


  get showEmployeeDropdown(): boolean {
    return this.newsForm.get('visibleTo')?.value === 'Selected';
  }

  onCancel() {
    this.dialogRef.close();
  }
}
