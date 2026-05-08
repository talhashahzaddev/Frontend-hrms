// skill-matrix.component.ts
import {
  Component, OnInit, OnDestroy, ChangeDetectorRef,
  ViewChild, TemplateRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';

import { PerformanceService } from '../../services/performance.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  SkillSet, SkillWithEmployees, EmployeeSkill, EmployeeSkillSummary,
  EmployeeSkillFullDetail, SKILL_CATEGORIES
} from 'src/app/core/models/performance.models';

@Component({
  selector: 'app-skill-matrix',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatTableModule, MatIconModule, MatButtonModule, MatMenuModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule,
    MatProgressSpinnerModule, MatChipsModule, MatDialogModule, MatDividerModule
  ],
  templateUrl: './skill-matrix.component.html',
  styleUrl: './skill-matrix.component.scss'
})
export class SkillMatrixComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<void>();
  private empSearchSubject$ = new Subject<void>();

  // Templates
  @ViewChild('createSkillTpl') createSkillTpl!: TemplateRef<any>;
  @ViewChild('addMySkillTpl') addMySkillTpl!: TemplateRef<any>;
  @ViewChild('editMySkillTpl') editMySkillTpl!: TemplateRef<any>;
  @ViewChild('viewSkillTpl') viewSkillTpl!: TemplateRef<any>;
  @ViewChild('viewEmployeeTpl') viewEmployeeTpl!: TemplateRef<any>;
  @ViewChild('assessTpl') assessTpl!: TemplateRef<any>;

  // ─── Tab ─────────────────────────────────────────────────────────────
  selectedTab = 0;

  // ─── Tab 1: Skill Sets ────────────────────────────────────────────────
  skills: SkillSet[] = [];
  totalSkills = 0;
  loadingSkills = false;
  skillsPageIndex = 0;
  skillsPageSize = 10;
  get skillsTotalPages() { return Math.max(1, Math.ceil(this.totalSkills / this.skillsPageSize)); }
  skillColumns = ['skillName', 'category', 'employeeCount', 'createdAt', 'status', 'actions'];

  skillsFilter = { search: '', category: '', isActive: null as boolean | null };

  // Employee skills summary (bottom table of tab 1)
  employeeSkillSummaries: EmployeeSkillSummary[] = [];
  totalEmployeeSkills = 0;
  loadingEmpSkills = false;
  empSkillsPageIndex = 0;
  empSkillsPageSize = 10;
  get empSkillsTotalPages() { return Math.max(1, Math.ceil(this.totalEmployeeSkills / this.empSkillsPageSize)); }
  empSkillColumns = ['employee', 'department', 'skills', 'avgProficiency', 'actions'];
  empSkillsFilter = { search: '' };

  // ─── Tab 2: My Skills ────────────────────────────────────────────────
  mySkills: EmployeeSkill[] = [];
  filteredMySkills: EmployeeSkill[] = [];
  loadingMySkills = false;
  mySkillsFilter = '';
  mySkillColumns = ['category', 'skillName', 'proficiency', 'assessedBy', 'lastAssessed', 'actions'];

  // ─── Shared ──────────────────────────────────────────────────────────
  allCategories = SKILL_CATEGORIES.map(c => c.name);
  pageSizeOptions = [5, 10, 25, 50];
  profLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // ─── Create Skill Dialog ──────────────────────────────────────────────
  createSkillForm!: FormGroup;
  filteredSkillsForCreate: string[] = [];
  isSubmittingSkill = false;

  // ─── Add My Skill Dialog ──────────────────────────────────────────────
  addMySkillForm!: FormGroup;
  filteredSkillsForAdd: SkillSet[] = [];
  availableSkillCategories: string[] = [];
  isSubmittingMySkill = false;

  // ─── Edit My Skill Dialog ─────────────────────────────────────────────
  editMySkillForm!: FormGroup;
  editingSkill: EmployeeSkill | null = null;

  // ─── View Skill Employees Dialog ──────────────────────────────────────
  viewingSkill: SkillWithEmployees | null = null;
  loadingViewSkill = false;
  viewSkillColumns = ['employee', 'dept', 'proficiency', 'assessor', 'notes'];

  // ─── View Employee Detail Dialog ──────────────────────────────────────
  viewingEmployee: EmployeeSkillFullDetail | null = null;
  loadingViewEmployee = false;

  // ─── Assess Dialog ────────────────────────────────────────────────────
  assessingEmployee: EmployeeSkillSummary | null = null;
  assessEmployeeSkills: EmployeeSkill[] = [];
  assessRatings: { [empSkillId: string]: number } = {};
  assessNotes: { [empSkillId: string]: string } = {};
  loadingAssessSkills = false;
  isSubmittingAssessment = false;

  constructor(
    private performanceService: PerformanceService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.initForms();
    this.loadSkills();
    if (this.hasHRRole() || this.hasManagerRole()) {
      this.loadEmployeeSkills();
    }
    this.loadMySkills();

    // Debounced search
    this.searchSubject$.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe(() => this.loadSkills());
    this.empSearchSubject$.pipe(debounceTime(350), takeUntil(this.destroy$)).subscribe(() => this.loadEmployeeSkills());
  }

  ngOnDestroy() { this.destroy$.next(); this.destroy$.complete(); }

  private initForms() {
    this.createSkillForm = this.fb.group({
      category: ['', Validators.required],
      skillName: ['', Validators.required],
      description: [''],
      isActive: [true]
    });

    this.addMySkillForm = this.fb.group({
      category: ['', Validators.required],
      skillId: ['', Validators.required],
      proficiencyLevel: [null, Validators.required],
      notes: ['']
    });

    this.editMySkillForm = this.fb.group({
      proficiencyLevel: [null, Validators.required],
      notes: ['']
    });
  }

  // ─── Tab ─────────────────────────────────────────────────────────────
  selectTab(tab: number) {
    this.selectedTab = tab;
    if (tab === 1 && this.mySkills.length === 0) this.loadMySkills();
  }

  // ─── Skills Loading ───────────────────────────────────────────────────
  loadSkills() {
    this.loadingSkills = true;
    this.performanceService.getSkillSets({
      search: this.skillsFilter.search || undefined,
      category: this.skillsFilter.category || undefined,
      isActive: this.skillsFilter.isActive ?? undefined,
      page: this.skillsPageIndex + 1,
      limit: this.skillsPageSize
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.skills = res.data.data;
          this.totalSkills = res.data.totalCount;
          // Rebuild category list from skills
          const cats = [...new Set(this.skills.map(s => s.category).filter(Boolean))] as string[];
          // Merge with SKILL_CATEGORIES to always show all
          this.allCategories = SKILL_CATEGORIES.map(c => c.name);
        }
        this.loadingSkills = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.notificationService.showError('Failed to load skills');
        this.loadingSkills = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSkillSearchChange() { this.searchSubject$.next(); }
  onEmpSearchChange() { this.empSearchSubject$.next(); }

  clearSkillFilters() {
    this.skillsFilter = { search: '', category: '', isActive: null };
    this.skillsPageIndex = 0;
    this.loadSkills();
  }

  hasSkillFilters() {
    return !!(this.skillsFilter.search || this.skillsFilter.category || this.skillsFilter.isActive !== null);
  }

  // ─── Employee Skills Loading ──────────────────────────────────────────
  loadEmployeeSkills() {
    this.loadingEmpSkills = true;
    this.performanceService.getAllEmployeeSkills({
      search: this.empSkillsFilter.search || undefined,
      page: this.empSkillsPageIndex + 1,
      limit: this.empSkillsPageSize
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.employeeSkillSummaries = res.data.data;
          this.totalEmployeeSkills = res.data.totalCount;
        }
        this.loadingEmpSkills = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.notificationService.showError('Failed to load employee skills');
        this.loadingEmpSkills = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ─── My Skills ───────────────────────────────────────────────────────
  loadMySkills() {
    this.loadingMySkills = true;
    this.performanceService.getMySkills().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.mySkills = res.data;
          this.applyMySkillFilters();
        }
        this.loadingMySkills = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.notificationService.showError('Failed to load your skills');
        this.loadingMySkills = false;
        this.cdr.markForCheck();
      }
    });
  }

  applyMySkillFilters() {
    const q = this.mySkillsFilter.toLowerCase();
    this.filteredMySkills = q
      ? this.mySkills.filter(s =>
          s.skillName.toLowerCase().includes(q) ||
          (s.skillCategory || '').toLowerCase().includes(q) ||
          (s.notes || '').toLowerCase().includes(q))
      : [...this.mySkills];
  }

  // ─── Create Skill Dialog ──────────────────────────────────────────────
  openCreateSkillDialog() {
    this.createSkillForm.reset({ isActive: true });
    this.filteredSkillsForCreate = [];
    this.dialog.open(this.createSkillTpl, { width: '520px', disableClose: false });
  }

  onCreateCategoryChange(cat: string) {
    const found = SKILL_CATEGORIES.find(c => c.name === cat);
    this.filteredSkillsForCreate = found ? found.skills : [];
    this.createSkillForm.get('skillName')?.setValue('');
  }

  submitCreateSkill() {
    if (this.createSkillForm.invalid) { this.createSkillForm.markAllAsTouched(); return; }
    this.isSubmittingSkill = true;
    const v = this.createSkillForm.value;
    this.performanceService.createSkillSet({
      skillName: v.skillName,
      category: v.category,
      description: v.description || undefined,
      isActive: v.isActive !== false
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.notificationService.showSuccess('Skill created successfully');
          this.dialog.closeAll();
          this.loadSkills();
        } else {
          this.notificationService.showError(res.message || 'Failed to create skill');
        }
        this.isSubmittingSkill = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err.error?.message || (err.status === 409 ? 'A skill with this name already exists.' : 'Failed to create skill');
        this.notificationService.showError(msg);
        this.isSubmittingSkill = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Toggle / Delete Skill ────────────────────────────────────────────
  toggleSkillStatus(skill: SkillSet) {
    this.performanceService.toggleSkillStatus(skill.skillId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.notificationService.showSuccess('Status updated'); this.loadSkills(); },
      error: () => this.notificationService.showError('Failed to update status')
    });
  }

  deleteSkill(skill: SkillSet) {
    if (!confirm(`Delete "${skill.skillName}"? ${skill.employeeCount > 0 ? `It will be deactivated (${skill.employeeCount} employees have this skill).` : 'This action cannot be undone.'}`)) return;
    this.performanceService.deleteSkill(skill.skillId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.notificationService.showSuccess('Skill deleted'); this.loadSkills(); },
      error: () => this.notificationService.showError('Failed to delete skill')
    });
  }

  // ─── View Skill Employees Dialog ──────────────────────────────────────
  viewSkillEmployees(skill: SkillSet) {
    this.viewingSkill = { ...skill, employees: [] };
    this.loadingViewSkill = true;
    this.dialog.open(this.viewSkillTpl, { width: '820px', maxWidth: '95vw' });
    this.performanceService.getSkillWithEmployees(skill.skillId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success && res.data) this.viewingSkill = res.data;
        this.loadingViewSkill = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingViewSkill = false; this.cdr.markForCheck(); }
    });
  }

  // ─── View Employee Detail Dialog ──────────────────────────────────────
  viewEmployeeSkillDetail(emp: EmployeeSkillSummary) {
    this.viewingEmployee = null;
    this.loadingViewEmployee = true;
    this.dialog.open(this.viewEmployeeTpl, { width: '680px', maxWidth: '95vw' });
    this.performanceService.getEmployeeSkillDetail(emp.employeeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success && res.data) this.viewingEmployee = res.data;
        this.loadingViewEmployee = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingViewEmployee = false; this.cdr.markForCheck(); }
    });
  }

  // ─── Assess Dialog ────────────────────────────────────────────────────
  openAssessDialog(emp: EmployeeSkillSummary) {
    this.assessingEmployee = emp;
    this.assessEmployeeSkills = [];
    this.assessRatings = {};
    this.assessNotes = {};
    this.loadingAssessSkills = true;
    this.dialog.open(this.assessTpl, { width: '620px', maxWidth: '95vw' });

    this.performanceService.getEmployeeSkillDetail(emp.employeeId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.assessEmployeeSkills = res.data.skills;
          // Pre-fill existing ratings
          res.data.skills.forEach(sk => {
            this.assessRatings[sk.employeeSkillId] = sk.proficiencyLevel || 0;
            this.assessNotes[sk.employeeSkillId] = sk.notes || '';
          });
        }
        this.loadingAssessSkills = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loadingAssessSkills = false; this.cdr.markForCheck(); }
    });
  }

  hasAllRatings(): boolean {
    return this.assessEmployeeSkills.every(sk => !!this.assessRatings[sk.employeeSkillId]);
  }

  submitAssessment() {
    if (!this.hasAllRatings()) return;
    this.isSubmittingAssessment = true;

    const requests = this.assessEmployeeSkills.map(sk =>
      this.performanceService.assessEmployeeSkill(sk.employeeSkillId, {
        proficiencyLevel: this.assessRatings[sk.employeeSkillId],
        notes: this.assessNotes[sk.employeeSkillId] || undefined,
        lastAssessed: new Date().toISOString()
      })
    );

    let done = 0;
    let errors = 0;
    requests.forEach(req => {
      req.pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          done++;
          if (done + errors === requests.length) this.finishAssessment(done, errors);
        },
        error: () => {
          errors++;
          if (done + errors === requests.length) this.finishAssessment(done, errors);
        }
      });
    });
  }

  private finishAssessment(done: number, errors: number) {
    this.isSubmittingAssessment = false;
    if (done > 0) {
      this.notificationService.showSuccess(`${done} skill(s) assessed successfully`);
      this.dialog.closeAll();
      this.loadEmployeeSkills();
    }
    if (errors > 0) this.notificationService.showError(`${errors} skill(s) failed to update`);
    this.cdr.markForCheck();
  }

  // ─── Add My Skill Dialog ──────────────────────────────────────────────
  openAddSkillDialog() {
    this.addMySkillForm.reset({ proficiencyLevel: null });
    this.filteredSkillsForAdd = [];
    // Build categories from existing org skills
    this.availableSkillCategories = [...new Set(this.skills.map(s => s.category).filter(Boolean))] as string[];
    this.dialog.open(this.addMySkillTpl, { width: '520px', disableClose: false });
  }

  onAddSkillCategoryChange(cat: string) {
    this.filteredSkillsForAdd = this.skills.filter(s => s.category === cat && s.isActive);
    this.addMySkillForm.get('skillId')?.setValue('');
  }

  isAlreadyAdded(skillId: string): boolean {
    return this.mySkills.some(s => s.skillId === skillId);
  }

  submitAddMySkill() {
    if (this.addMySkillForm.invalid) { this.addMySkillForm.markAllAsTouched(); return; }
    const v = this.addMySkillForm.value;
    if (!v.proficiencyLevel) { this.notificationService.showWarning('Please select a proficiency level'); return; }
    this.isSubmittingMySkill = true;
    this.performanceService.addMySkill({
      employeeId: '', // server sets from token
      skillId: v.skillId,
      proficiencyLevel: v.proficiencyLevel,
      notes: v.notes || undefined
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.notificationService.showSuccess('Skill added successfully');
          this.dialog.closeAll();
          this.loadMySkills();
        } else {
          this.notificationService.showError(res.message || 'Failed to add skill');
        }
        this.isSubmittingMySkill = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const msg = err.status === 409 ? 'You already have this skill.' : 'Failed to add skill';
        this.notificationService.showError(msg);
        this.isSubmittingMySkill = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Edit My Skill Dialog ─────────────────────────────────────────────
  editMySkill(skill: EmployeeSkill) {
    this.editingSkill = skill;
    this.editMySkillForm.setValue({ proficiencyLevel: skill.proficiencyLevel, notes: skill.notes || '' });
    this.dialog.open(this.editMySkillTpl, { width: '480px', disableClose: false });
  }

  submitEditMySkill() {
    if (this.editMySkillForm.invalid || !this.editingSkill) return;
    this.isSubmittingMySkill = true;
    const v = this.editMySkillForm.value;
    this.performanceService.updateMySkill(this.editingSkill.employeeSkillId, {
      proficiencyLevel: v.proficiencyLevel,
      notes: v.notes || undefined,
      lastAssessed: new Date().toISOString()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.notificationService.showSuccess('Skill updated');
          this.dialog.closeAll();
          this.loadMySkills();
        }
        this.isSubmittingMySkill = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.notificationService.showError('Failed to update skill');
        this.isSubmittingMySkill = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Remove My Skill ──────────────────────────────────────────────────
  removeMySkill(skill: EmployeeSkill) {
    if (!confirm(`Remove "${skill.skillName}" from your skills?`)) return;
    this.performanceService.deleteMySkill(skill.employeeSkillId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.notificationService.showSuccess('Skill removed'); this.loadMySkills(); },
      error: () => this.notificationService.showError('Failed to remove skill')
    });
  }

  // ─── Stats ────────────────────────────────────────────────────────────
  getMyAvgProficiency(): string {
    if (!this.mySkills.length) return '0';
    const avg = this.mySkills.reduce((s, sk) => s + sk.proficiencyLevel, 0) / this.mySkills.length;
    return avg.toFixed(1);
  }

  getMyTopCategory(): string {
    if (!this.mySkills.length) return '';
    const counts: Record<string, number> = {};
    this.mySkills.forEach(s => {
      const cat = s.skillCategory || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  }

  getAssessedCount(): number {
    return this.mySkills.filter(s => s.assessorName).length;
  }


    hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Performance', 'Skill Matrix', actionKey);
  }

  // ─── Pagination helpers ───────────────────────────────────────────────
  min(a: number, b: number) { return Math.min(a, b); }

  goToFirstSkillPage() { this.skillsPageIndex = 0; this.loadSkills(); }
  prevSkillPage() { if (this.skillsPageIndex > 0) { this.skillsPageIndex--; this.loadSkills(); } }
  nextSkillPage() { if (this.skillsPageIndex < this.skillsTotalPages - 1) { this.skillsPageIndex++; this.loadSkills(); } }
  goToLastSkillPage() { this.skillsPageIndex = this.skillsTotalPages - 1; this.loadSkills(); }
  onSkillPageSizeChange(size: number) { this.skillsPageSize = size; this.skillsPageIndex = 0; this.loadSkills(); }

  goToFirstEmpPage() { this.empSkillsPageIndex = 0; this.loadEmployeeSkills(); }
  prevEmpPage() { if (this.empSkillsPageIndex > 0) { this.empSkillsPageIndex--; this.loadEmployeeSkills(); } }
  nextEmpPage() { if (this.empSkillsPageIndex < this.empSkillsTotalPages - 1) { this.empSkillsPageIndex++; this.loadEmployeeSkills(); } }
  goToLastEmpPage() { this.empSkillsPageIndex = this.empSkillsTotalPages - 1; this.loadEmployeeSkills(); }
  onEmpPageSizeChange(size: number) { this.empSkillsPageSize = size; this.empSkillsPageIndex = 0; this.loadEmployeeSkills(); }

  // ─── Role helpers ─────────────────────────────────────────────────────
  hasHRRole(): boolean { return this.authService.hasAnyRole(['Super Admin', 'HR Manager']); }
  hasManagerRole(): boolean { return this.authService.hasAnyRole(['Super Admin', 'HR Manager', 'Manager']); }

  // ─── Proficiency helpers ──────────────────────────────────────────────
  getProfClass(level: number): string {
    if (level >= 9) return 'prof--expert';
    if (level >= 7) return 'prof--advanced';
    if (level >= 5) return 'prof--intermediate';
    if (level >= 3) return 'prof--beginner';
    return 'prof--novice';
  }

  getProfClass2(level: number): string {
    // For button color class
    if (level >= 9) return 'expert';
    if (level >= 7) return 'advanced';
    if (level >= 5) return 'intermediate';
    if (level >= 3) return 'beginner';
    return 'novice';
  }

  getProfLabel(level: number): string {
    if (level >= 9) return 'Expert';
    if (level >= 7) return 'Advanced';
    if (level >= 5) return 'Intermediate';
    if (level >= 3) return 'Beginner';
    return 'Novice';
  }

  getInitials(name: string): string {
    return name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  }
}