import {
  Component, OnInit, OnDestroy, ElementRef,
  HostListener, ViewChild, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule, ReactiveFormsModule, FormBuilder, FormGroup,
  Validators, AbstractControl, ValidationErrors, AsyncValidatorFn
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import {
  map, catchError, debounceTime, distinctUntilChanged,
  switchMap, takeUntil
} from 'rxjs/operators';

import { AuthService } from '@core/services/auth.service';
import { DomainService } from '@core/services/domain.service';
import { RegisterRequest, AuthResponse } from '@core/models/auth.models';
import { environment } from '@environments/environment';

interface CurrencyOption {
  code: string;
  name: string;
  label: string;
}

@Component({
  selector: 'app-dev-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './dev-signup.component.html',
  styleUrls: ['./dev-signup.component.scss']
})
export class DevSignupComponent implements OnInit, OnDestroy {
  signUpForm!: FormGroup;
  submitted = false;
  isSubmitting = false;
  submitSuccess = false;
  verificationEmailSent = false;
  isDev = !environment.production;

  @ViewChild('currencyInput') currencyInputRef?: ElementRef<HTMLInputElement>;

  // ── Currency dropdown state ─────────────────────────────────
  currencies: CurrencyOption[] = [];
  filteredCurrencies: CurrencyOption[] = [];
  currencySearch = '';
  currencyDropdownOpen = false;
  currencyLoading = false;
  currencyLoadError = false;

  private destroy$ = new Subject<void>();

  get selectedCurrency(): CurrencyOption | null {
    const code = this.signUpForm.get('currency')?.value;
    return code ? (this.currencies.find(c => c.code === code) ?? null) : null;
  }

  companySizes = [
    '1-10 employees',
    '11-50 employees',
    '51-200 employees',
    '201-500 employees',
    '500+ employees'
  ];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private domainService: DomainService,
    private http: HttpClient,
    private elRef: ElementRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.signUpForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName:  ['', [Validators.required, Validators.minLength(2)]],
      email:     ['', [Validators.required, Validators.email]],
      password:  ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      companyName: ['', [Validators.required]],
      companySize: ['', [Validators.required]],
      website: [
        '',
        [Validators.required, this.domainFormatValidator()],
        [this.domainExistsValidator()]
      ],
      currency: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    this.loadCurrencies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Load currencies ─────────────────────────────────────────
  loadCurrencies(): void {
    this.currencyLoading = true;
    this.currencyLoadError = false;
    this.http.get<Record<string, string>>(
      'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json'
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (data) => {
        this.currencies = Object.entries(data)
          .filter(([, name]) => name && name.trim() !== '')
          .map(([code, name]) => ({
            code: code.toUpperCase(), name,
            label: `${name} (${code.toUpperCase()})`
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        this.filteredCurrencies = [...this.currencies];
        this.currencyLoading = false;
      },
      error: () => {
        this.currencies = [
          { code: 'USD', name: 'US Dollar',       label: 'US Dollar (USD)' },
          { code: 'PKR', name: 'Pakistani Rupee', label: 'Pakistani Rupee (PKR)' },
          { code: 'EUR', name: 'Euro',             label: 'Euro (EUR)' },
          { code: 'GBP', name: 'British Pound',    label: 'British Pound (GBP)' }
        ];
        this.filteredCurrencies = [...this.currencies];
        this.currencyLoadError = true;
        this.currencyLoading = false;
      }
    });
  }

  // ── Currency dropdown interactions ──────────────────────────
  openCurrencyDropdown(): void {
    if (this.currencyLoading || this.currencyDropdownOpen) return;
    this.currencyDropdownOpen = true;
    this.currencySearch = '';
    this.filteredCurrencies = [...this.currencies];
    setTimeout(() => {
      const input = this.currencyInputRef?.nativeElement;
      if (input) {
        input.removeAttribute('readonly');
        input.value = '';
        input.focus();
      }
    }, 0);
  }

  closeCurrencyDropdown(): void {
    this.currencyDropdownOpen = false;
    this.currencySearch = '';
    this.filteredCurrencies = [...this.currencies];
    const input = this.currencyInputRef?.nativeElement;
    if (input) {
      input.setAttribute('readonly', 'true');
      input.value = this.selectedCurrency?.label || '';
    }
  }

  toggleCurrencyDropdown(): void {
    if (this.currencyDropdownOpen) this.closeCurrencyDropdown();
    else this.openCurrencyDropdown();
  }

  onCurrencySearch(value: string): void {
    this.currencySearch = value;
    const q = value.toLowerCase().trim();
    this.filteredCurrencies = q
      ? this.currencies.filter(c =>
          c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
        )
      : [...this.currencies];
  }

  selectCurrency(currency: CurrencyOption): void {
    this.signUpForm.patchValue({ currency: currency.code });
    this.signUpForm.get('currency')?.markAsTouched();
    this.closeCurrencyDropdown();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.closeCurrencyDropdown();
    }
  }

  // ── Validators ──────────────────────────────────────────────
  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const pw  = control.get('password');
    const cpw = control.get('confirmPassword');
    if (!pw || !cpw) return null;
    return pw.value === cpw.value ? null : { passwordMismatch: true };
  }

  private domainFormatValidator(): (c: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl) => {
      if (!control.value) return null;
      const v = control.value.trim();
      if (!/^[a-zA-Z0-9-]+$/.test(v)) return { invalidFormat: true };
      if (v.includes('--')) return { invalidFormat: true };
      if (v.startsWith('-') || v.endsWith('-')) return { invalidFormat: true };
      return null;
    };
  }

  private domainExistsValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value?.trim()) return of(null);
      const domain = control.value.trim().toLowerCase();
      if (this.domainFormatValidator()(control)) return of(null);
      return of(domain).pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(d =>
          this.domainService.validateDomain(d).pipe(
            map(res => res.isValid ? { domainExists: true } : null),
            catchError(() => of(null))
          )
        )
      );
    };
  }

  onDomainInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let v = input.value
      .replace(/\s/g, '')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
    if (v !== input.value) this.signUpForm.patchValue({ website: v }, { emitEvent: false });
  }

  // ── Submit ──────────────────────────────────────────────────
  onSubmit(): void {
    this.submitted = true;
    if (this.signUpForm.invalid) return;

    this.isSubmitting = true;
    const fv = this.signUpForm.value;
    const request: RegisterRequest = {
      firstName: fv.firstName,
      lastName:  fv.lastName,
      email:     fv.email,
      password:  fv.password,
      companyName: fv.companyName,
      companySize: fv.companySize,
      website:   fv.website,
      currency:  fv.currency
    };

    this.authService.register(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: AuthResponse) => {
          this.isSubmitting = false;
          if (response.token == null) {
            this.verificationEmailSent = true;
            this.submitted = false;
          } else {
            // Redirect to the dev login page after successful registration
            this.router.navigate(['/login']);
          }
        },
        error: (error) => {
          console.error('Dev signup error:', error);
          this.isSubmitting = false;
        }
      });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  // ── Error messages ──────────────────────────────────────────
  getErrorMessage(fieldName: string): string {
    const field = this.signUpForm.get(fieldName);
    if (field?.hasError('required')) return `${this.getFieldLabel(fieldName)} is required`;
    if (field?.hasError('email')) return 'Please enter a valid email address';
    if (field?.hasError('minlength')) {
      return `${this.getFieldLabel(fieldName)} must be at least ${field.errors?.['minlength'].requiredLength} characters`;
    }
    if (field?.hasError('invalidFormat')) return 'Only letters, numbers, and hyphens are allowed';
    if (field?.hasError('domainExists')) return 'This domain is already taken. Choose another.';
    if (fieldName === 'confirmPassword' && this.signUpForm.hasError('passwordMismatch')) return 'Passwords do not match';
    return '';
  }

  getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      firstName: 'First Name', lastName: 'Last Name', email: 'Email',
      password: 'Password', confirmPassword: 'Confirm Password',
      companyName: 'Company Name', companySize: 'Company Size',
      website: 'Domain', currency: 'Currency'
    };
    return labels[fieldName] || fieldName;
  }
}
