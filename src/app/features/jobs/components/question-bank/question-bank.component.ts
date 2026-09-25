import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { QuestionBankService } from '../../services/question-bank.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { QuestionCategoryDto, QuestionDto } from '@core/models/jobs.models';

import { CreateCategoryDialogComponent } from '../create-category-dialog/create-category-dialog.component';
import { CreateQuestionDialogComponent } from '../create-question-dialog/create-question-dialog.component';
import { ConfirmDeleteDialogComponent } from '@shared/components/confirm-delete-dialog/confirm-delete-dialog.component';

@Component({
  selector: 'app-question-bank',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './question-bank.component.html',
  styleUrls: ['./question-bank.component.scss']
})
export class QuestionBankComponent implements OnInit {
  categories: QuestionCategoryDto[] = [];
  selectedCategoryControl = new FormControl<string | null>(null);
  
  questions: QuestionDto[] = [];
  isLoadingCategories = false;
  isLoadingQuestions = false;

  constructor(
    private qbService: QuestionBankService,
    private notification: NotificationService,
    public authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadCategories();

    this.selectedCategoryControl.valueChanges.subscribe(categoryId => {
      if (categoryId) {
        this.loadQuestions(categoryId);
      } else {
        this.questions = [];
      }
    });
  }

  loadCategories(): void {
    this.isLoadingCategories = true;
    this.qbService.getCategories().subscribe({
      next: (res) => {
        this.categories = res;
        this.isLoadingCategories = false;
        
        // Auto-select first category if none is selected
        if (this.categories.length > 0 && !this.selectedCategoryControl.value) {
          this.selectedCategoryControl.setValue(this.categories[0].categoryId);
        }
      },
      error: () => {
        this.notification.showError('Failed to load categories.');
        this.isLoadingCategories = false;
      }
    });
  }

  loadQuestions(categoryId: string): void {
    this.isLoadingQuestions = true;
    this.qbService.getQuestionsByCategory(categoryId).subscribe({
      next: (res) => {
        this.questions = res;
        this.isLoadingQuestions = false;
      },
      error: () => {
        this.notification.showError('Failed to load questions.');
        this.isLoadingQuestions = false;
      }
    });
  }

  openCreateCategoryDialog(): void {
    const dialogRef = this.dialog.open(CreateCategoryDialogComponent, {
      width: '600px',
      panelClass: 'hrms-dialog-panel',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.qbService.createCategory(result).subscribe({
          next: (cat) => {
            this.notification.showSuccess('Category created!');
            this.loadCategories();
            this.selectedCategoryControl.setValue(cat.categoryId);
          },
          error: (err) => this.notification.showError(err.message || 'Failed to create category')
        });
      }
    });
  }

  openCreateQuestionDialog(): void {
    const categoryId = this.selectedCategoryControl.value;
    if (!categoryId) {
      this.notification.showError('Please select a category first.');
      return;
    }

    const dialogRef = this.dialog.open(CreateQuestionDialogComponent, {
      width: '700px',
      panelClass: 'hrms-dialog-panel',
      disableClose: true,
      data: { categoryId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.qbService.createQuestion(categoryId, result).subscribe({
          next: () => {
            this.notification.showSuccess('Question added!');
            this.loadQuestions(categoryId);
          },
          error: (err) => this.notification.showError(err.message || 'Failed to add question')
        });
      }
    });
  }

  editQuestion(question: QuestionDto): void {
    const dialogRef = this.dialog.open(CreateQuestionDialogComponent, {
      width: '700px',
      panelClass: 'hrms-dialog-panel',
      disableClose: true,
      data: { categoryId: question.categoryId, question }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.qbService.updateQuestion(question.questionId, result).subscribe({
          next: () => {
            this.notification.showSuccess('Question updated!');
            if (this.selectedCategoryControl.value) {
              this.loadQuestions(this.selectedCategoryControl.value);
            }
          },
          error: (err) => this.notification.showError(err.message || 'Failed to update question')
        });
      }
    });
  }

  deleteQuestion(questionId: string): void {
    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Question',
        message: 'Are you sure you want to delete this question? This action cannot be undone.'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.qbService.deleteQuestion(questionId).subscribe({
          next: () => {
            this.notification.showSuccess('Question deleted!');
            if (this.selectedCategoryControl.value) {
              this.loadQuestions(this.selectedCategoryControl.value);
            }
          },
          error: () => this.notification.showError('Failed to delete question.')
        });
      }
    });
  }

  hasPermission(permission: string): boolean {
    return this.authService.hasPermissionByActionKey(permission);
  }

  parseOptions(optionsStr: string | undefined): string[] {
    if (!optionsStr) return [];
    try {
      const parsed = JSON.parse(optionsStr);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Not JSON, might be comma-separated
    }
    return optionsStr.split(',').map(s => s.trim()).filter(s => !!s);
  }
}
