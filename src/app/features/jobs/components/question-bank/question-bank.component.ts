import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { QuestionBankService } from '../../services/question-bank.service';
import { NotificationService } from '@core/services/notification.service';
import { AuthService } from '@core/services/auth.service';
import { QuestionCategoryDto, QuestionDto } from '@core/models/jobs.models';

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
    MatCheckboxModule,
    MatTabsModule
  ],
  templateUrl: './question-bank.component.html',
  styleUrls: ['./question-bank.component.scss']
})
export class QuestionBankComponent implements OnInit {
  categories: QuestionCategoryDto[] = [];
  selectedCategory: QuestionCategoryDto | null = null;
  questions: QuestionDto[] = [];

  showCategoryForm = false;
  categoryForm: FormGroup;

  showQuestionForm = false;
  questionForm: FormGroup;
  questionTypes = ['Text', 'True/False', 'Multiple Choice'];

  constructor(
    private qbService: QuestionBankService,
    private fb: FormBuilder,
    private notification: NotificationService,
    public authService: AuthService
  ) {
    this.categoryForm = this.fb.group({
      categoryName: ['', Validators.required],
      description: ['']
    });

    this.questionForm = this.fb.group({
      questionText: ['', Validators.required],
      questionType: ['Text', Validators.required],
      options: [''], // Comma-separated for multiple choice
      correctOption: [''],
      isKnockout: [false]
    });
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.qbService.getCategories().subscribe({
      next: (res) => {
        this.categories = res;
        if (this.categories.length > 0 && !this.selectedCategory) {
          this.selectCategory(this.categories[0]);
        }
      },
      error: () => this.notification.showError('Failed to load categories.')
    });
  }

  selectCategory(category: QuestionCategoryDto): void {
    this.selectedCategory = category;
    this.showCategoryForm = false;
    this.showQuestionForm = false;
    this.loadQuestions(category.categoryId);
  }

  loadQuestions(categoryId: string): void {
    this.qbService.getQuestionsByCategory(categoryId).subscribe({
      next: (res) => this.questions = res,
      error: () => this.notification.showError('Failed to load questions.')
    });
  }

  saveCategory(): void {
    if (this.categoryForm.invalid) return;
    this.qbService.createCategory(this.categoryForm.value).subscribe({
      next: (cat) => {
        this.notification.showSuccess('Category created!');
        this.showCategoryForm = false;
        this.categoryForm.reset();
        this.loadCategories();
        this.selectCategory(cat);
      },
      error: (err) => this.notification.showError(err.message)
    });
  }

  saveQuestion(): void {
    if (this.questionForm.invalid || !this.selectedCategory) return;
    
    // Convert options string to a valid format if Multiple Choice, but backend accepts simple string
    const payload = { ...this.questionForm.value };
    
    this.qbService.createQuestion(this.selectedCategory.categoryId, payload).subscribe({
      next: () => {
        this.notification.showSuccess('Question added!');
        this.showQuestionForm = false;
        this.questionForm.reset({ questionType: 'Text', isKnockout: false });
        this.loadQuestions(this.selectedCategory!.categoryId);
      },
      error: (err) => this.notification.showError(err.message)
    });
  }

  deleteQuestion(questionId: string): void {
    if(!confirm('Are you sure you want to delete this question?')) return;
    this.qbService.deleteQuestion(questionId).subscribe({
      next: () => {
        this.notification.showSuccess('Question deleted!');
        if (this.selectedCategory) {
          this.loadQuestions(this.selectedCategory.categoryId);
        }
      },
      error: () => this.notification.showError('Failed to delete question.')
    });
  }

  get showOptionsField(): boolean {
    return this.questionForm.get('questionType')?.value === 'Multiple Choice';
  }
}
