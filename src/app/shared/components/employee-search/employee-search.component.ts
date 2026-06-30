import { Component, EventEmitter, Output, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { EmployeeService } from '../../../features/employee/services/employee.service';
import { Employee } from '../../../core/models/employee.models';

@Component({
  selector: 'app-employee-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="employee-search">
      <input
        type="text"
        [(ngModel)]="searchTerm"
        (ngModelChange)="onSearchChange($event)"
        (focus)="showDropdown = results.length > 0"
        (blur)="onBlur()"
        [placeholder]="placeholder"
        class="search-input"
        autocomplete="off"
      />
      @if (showDropdown && results.length > 0) {
        <div class="dropdown">
          @for (emp of results; track emp.employeeId) {
            <div class="dropdown-item" (mousedown)="selectEmployee(emp)">
              <span class="emp-name">{{ emp.firstName }} {{ emp.lastName }}</span>
              <span class="emp-meta">{{ emp.employeeCode }}{{ emp.departmentName ? ' · ' + emp.departmentName : '' }}</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .employee-search { position: relative; width: 100%; }
    .search-input {
      width: 100%; padding: 8px 12px; border: 1px solid var(--ts-border, #e2e8f0); border-radius: 6px;
      font-size: 0.875rem; box-sizing: border-box; height: 40px;
    }
    .search-input:focus { border-color: #2563eb; outline: none; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
    .dropdown {
      position: absolute; top: 100%; left: 0; right: 0; z-index: 50;
      background: #fff; border: 1px solid #e0e0e0; border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12); max-height: 240px; overflow-y: auto;
      margin-top: 4px;
    }
    .dropdown-item {
      padding: 10px 14px; cursor: pointer; display: flex;
      justify-content: space-between; align-items: center;
      border-bottom: 1px solid #f5f5f5;
    }
    .dropdown-item:last-child { border-bottom: none; }
    .dropdown-item:hover { background: #f5f8ff; }
    .emp-name { font-weight: 500; font-size: 0.875rem; }
    .emp-meta { font-size: 0.75rem; color: #999; }
  `]
})
export class EmployeeSearchComponent implements OnInit, OnDestroy {
  @Input() placeholder = 'Search employee by name...';
  @Output() employeeSelected = new EventEmitter<Employee>();

  searchTerm = '';
  results: Employee[] = [];
  showDropdown = false;
  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private employeeService: EmployeeService) {}

  ngOnInit() {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || term.length < 2) { this.results = []; this.showDropdown = false; return []; }
        return this.employeeService.getEmployees({ searchTerm: term, page: 1, pageSize: 8, isActive: true } as any);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (res) => {
        this.results = res.employees || [];
        this.showDropdown = this.results.length > 0;
      },
      error: () => { this.results = []; }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(value: string) {
    this.search$.next(value);
  }

  selectEmployee(emp: Employee) {
    this.searchTerm = `${emp.firstName} ${emp.lastName}`;
    this.showDropdown = false;
    this.results = [];
    this.employeeSelected.emit(emp);
  }

  onBlur() {
    // Delay to allow mousedown on dropdown item to fire first
    setTimeout(() => { this.showDropdown = false; }, 200);
  }
}
