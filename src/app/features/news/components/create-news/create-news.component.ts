import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { NewsDto } from '@/app/core/models/news.models';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { EmployeeService } from '@/app/features/employee/services/employee.service';
import { Employee } from '@/app/core/models/employee.models';
import { PerformanceService } from '@/app/features/performance/services/performance.service';
import { Subject, takeUntil } from 'rxjs';
import { NotificationService } from '@/app/core/services/notification.service';
import { NewsService } from '../../services/news.services';
import { QuillModule } from 'ngx-quill';

@Component({
  selector: 'app-create-news',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    QuillModule ,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule
  ],
  templateUrl: './create-news.component.html',
  styleUrls: ['./create-news.component.scss']
})
export class CreateNewsComponent implements OnInit {
  newsForm: FormGroup;
  isSubmitting = false;
  isLoading = false;
  isEditMode = false;
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
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.newsForm = this.fb.group({
      title: ['', Validators.compose([
        Validators.required,
        Validators.maxLength(200), // fallback for very long titles
        this.wordCountValidator(20)
      ])],
      description: ['', Validators.required],
      category: ['', Validators.required],
      imageUrl: [''],
      status: ['Draft', Validators.required],
      visibleTo: ['Everyone', Validators.required],
      selectedEmployees: [[]]
    });
  }

  // Custom validator to restrict word count
  wordCountValidator(maxWords: number) {
    return (control: any) => {
      if (!control.value) return null;
      const wordCount = control.value.trim().split(/\s+/).length;
      return wordCount > maxWords ? { maxWords: { value: maxWords } } : null;
    };
  }
quillConfig = {
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],        // basic formatting
    [{ header: [1, 2, 3, false] }],                  // headings
    [{ align: [] }],                                 // text alignment
    [{ list: 'ordered' }, { list: 'bullet' }],      // lists
    ['link', 'image'],                               // links & images
    ['clean']                                        // remove formatting
  ]
};




  // Prevent entering more than 20 words in the input
  onTitleInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    // Remove leading spaces and collapse multiple spaces
    value = value.replace(/\s+/g, ' ').trim();
    const words = value.split(' ');
    if (words.length > 20) {
      const trimmed = words.slice(0, 20).join(' ');
      input.value = trimmed;
      // Update form control without emitting event to avoid cursor jump
      this.newsForm.get('title')?.setValue(trimmed, { emitEvent: false });
    } else {
      this.newsForm.get('title')?.setValue(value, { emitEvent: false });
    }
  }

  ngOnInit() {
    // Check for edit mode via route param
    const newsId = this.route.snapshot.paramMap.get('id');
    this.isEditMode = !!newsId;
    if (this.isEditMode) {
      this.isLoading = true;
      this.newsService.getNewsById(newsId!).subscribe({
        next: (news: NewsDto) => {
          this.newsForm.patchValue(news);
          if (news.imageUrl) {
            this.imagePreview = news.imageUrl;
          }
          this.isLoading = false;
        },
        error: () => {
          this.notification.showError('Failed to load news');
          this.isLoading = false;
        }
      });
    }
    this.loadEmployees();
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
    this.isSubmitting = true;
    const formValue = this.newsForm.value;
    const request: any = {
      title: formValue.title,
      description: formValue.description,
      category: formValue.category,
      status: formValue.status,
      visibleTo: formValue.visibleTo,
      selectedEmployees: formValue.selectedEmployees || [],
      imageUrl: formValue.imageUrl || ''
    };
    if (this.isEditMode) {
      const newsId = this.route.snapshot.paramMap.get('id');
      this.newsService.editNews(newsId!, request).subscribe({
        next: () => {
          this.notification.showSuccess('News updated successfully');
          this.isSubmitting = false;
          this.router.navigate(['/news']);
        },
        error: (err) => {
          this.notification.showError(err?.message || 'Failed to update news');
          this.isSubmitting = false;
        }
      });
    } else {
      this.newsService.createNews(request).subscribe({
        next: (news) => {
          this.notification.showSuccess('News created successfully');
          this.isSubmitting = false;
          this.router.navigate(['/news']);
        },
        error: (err) => {
          this.notification.showError(err?.message || 'Failed to create news');
          this.isSubmitting = false;
        }
      });
    }
  }

  // Removed updateNews method; handled in onSubmit



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
    this.router.navigate(['/news']);
  }
}
