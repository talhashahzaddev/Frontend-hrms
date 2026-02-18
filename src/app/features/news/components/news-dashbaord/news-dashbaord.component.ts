import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { NewsService } from '../../services/news.services';
import { NewsDto } from '@/app/core/models/news.models';
import { CreateNewsComponent } from '../create-news/create-news.component';
import { Subject, takeUntil } from 'rxjs';
import { NewsViewDialogueboxComponent } from './news-view-dialoguebox';
import { AuthService } from '@/app/core/services/auth.service';
import { MatMenuModule } from '@angular/material/menu';
import { is } from 'date-fns/locale';
@Component({
  selector: 'app-news-dashbaord',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatMenuModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    MatChipsModule
  ],
  templateUrl: './news-dashbaord.component.html',
  styleUrls: ['./news-dashbaord.component.scss']
})
export class NewsDashbaordComponent implements OnInit {
  private destroy$ = new Subject<void>();
  isLoading = false;
  newsList: NewsDto[] = [];
  filteredNews: NewsDto[] = [];
  newsDataSource = new MatTableDataSource<NewsDto>([]);
  displayedColumns: string[] = ['title', 'category', 'status', 'publishedAt'];
  // Toggle status for a news item
  onStatusToggle(news: NewsDto): void {
    const newStatus = news.status === 'Published' ? 'Draft' : 'Published';
    const newsId = news.newsId;
    if (!newsId) return; // Guard: skip if no newsId
    this.isLoading = true;
    this.newsService.updateNewsStatus(String(newsId), newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            news.status = newStatus;
            this.applyFilters();
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }
  // Pagination
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;
  // Filter form
  filterForm: FormGroup;

  constructor(
    private newsService: NewsService,
    private authService: AuthService,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.filterForm = this.fb.group({
      search: [''],
      category: [''],
      status: ['']
    });
  }

  ngOnInit(): void {
    this.loadNews();
    
  if (this.isAdminOrHR) {
    this.displayedColumns.push('VisibleTo');
    this.displayedColumns.push('actions');
  }
  }

  // Role helpers
  get isSuperAdmin(): boolean {
    return this.authService.hasRole('Super Admin');
  }
  get isManager(): boolean {
    return this.authService.hasRole('Manager');
  }

  get isHRManager(): boolean {
    return this.authService.hasRole('HR Manager');
  }

  get isAdminOrHR(): boolean {
    return this.authService.hasAnyRole(['Super Admin', 'HR Manager']);
  }

  get isEmployee(): boolean {
    return this.authService.hasRole('Employee');
  }

  hasRole(role: string): boolean {
    return this.authService.hasRole(role);
  }

  loadNews(): void {
    this.isLoading = true;
    const searchModel: any = {
      page: this.pageIndex + 1,
      pageSize: this.pageSize,
      search: this.filterForm.get('search')?.value || '',
      category: this.filterForm.get('category')?.value || '',
      status: this.filterForm.get('status')?.value || ''
    };
    this.newsService.getAllNews(searchModel)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paged) => {
          this.newsList = paged.data || [];
          this.totalItems = paged.totalCount || 0;
          this.applyFilters();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  deleteNews(newsId: string): void {
    if (!newsId) return;

    const confirmDelete = confirm('Are you sure you want to delete this news?');
    if (!confirmDelete) return;

    this.isLoading = true;

    this.newsService.deleteNews(newsId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (isDeleted) => {
          if (isDeleted) {
            // Remove from UI instantly (optional but smooth)
            this.newsList = this.newsList.filter(n => n.newsId !== newsId);
            this.applyFilters();
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  // Navigate to create-news page in edit mode (as route param)
  navigateToEdit(news: NewsDto): void {
    if (!news?.newsId) return;
    this.router.navigate(['/news/create-news', news.newsId]);
  }

  openViewDialog(news: NewsDto): void {
    if (!news?.newsId) return;
    this.router.navigate(['/news/view-news', news.newsId]);
  }



  applyFilters(): void {
    const searchTerm = (this.filterForm.get('search')?.value || '').toLowerCase();
    const category = this.filterForm.get('category')?.value || '';
    const status = this.filterForm.get('status')?.value || '';
    this.filteredNews = this.newsList.filter(news => {
      const matchesSearch = !searchTerm ||
        news.title.toLowerCase().includes(searchTerm) ||
        (news.description && news.description.toLowerCase().includes(searchTerm));
      const matchesCategory = !category || news.category === category;
      const matchesStatus = !status || news.status === status;
      return matchesSearch && matchesCategory && matchesStatus;
    });
    this.newsDataSource.data = this.filteredNews;
  }

  clearFilters(): void {
    this.filterForm.reset({
      search: '',
      category: '',
      status: ''
    });
    this.pageIndex = 0;
    this.loadNews();
  }

  openCreateDialog(): void {
    this.router.navigate(['/news/create-news']);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadNews();
  }

  getStatusClass(status: string): string {
    return status === 'Published' ? 'status-active' : 'status-inactive';
  }
}
