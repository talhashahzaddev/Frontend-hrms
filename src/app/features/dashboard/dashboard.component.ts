import {
  Component, OnInit, OnDestroy,
  ChangeDetectionStrategy, ChangeDetectorRef, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil, forkJoin, of, Observable, interval } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { SharedCommonModule } from '@shared/shared-common.module';

import { AuthService } from '@core/services/auth.service';
import { NotificationService } from '@core/services/notification.service';
import { User } from '@core/models/auth.models';
import { DashboardService } from './services/dashboard.service';
import { AttendanceService } from '../attendance/services/attendance.service';
import { PayrollService } from '../payroll/services/payroll.service';
import { AssetsService } from '../assets/services/assets.service';
import { PerformanceService } from '../performance/services/performance.service';
import { AppraisalStatus } from '@core/models/performance.models';
import { NewsService } from '../news/services/news.services';
import { HolidayService } from '../holiday/services/holiday.service';
import { SettingsService } from '../settings/services/settings.service';
import { GeoFenceService, GeoClockInRequest } from '../attendance/services/geofence.service';
import { TimeTrackingSession } from '@core/models/attendance.models';
import { CommentDialogComponent } from '@shared/components/comment-dialog/comment-dialog.component';
import {
  EmployeeOverview,
  ManagerOverview,
  HrOverview,
  HrStats,
  LatestHiredEmployee
} from '@core/models/dashboard.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatDialogModule,
    MatTooltipModule,
    SharedCommonModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private authService = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private attendanceService = inject(AttendanceService);
  private payrollService = inject(PayrollService);
  private assetsService = inject(AssetsService);
  private performanceService = inject(PerformanceService);
  private newsService = inject(NewsService);
  private holidayService = inject(HolidayService);
  private settingsService = inject(SettingsService);
  private geoFenceService = inject(GeoFenceService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);

  currentUser: User | null = null;
  isLoading = true;

  employeeData: EmployeeOverview | null = null;
  managerData: ManagerOverview | null = null;
  hrOverviewData: HrOverview | null = null;
  hrStatsData: HrStats | null = null;
  latestHires: LatestHiredEmployee[] = [];
  currentHireIndex = 0;
  isHireAnimating = false;
  
  combinedFinancialRequests: any[] = [];
  
  financeCurrentPage = 1;
  financeTotalRecords = 0;
  financeTotalPages = 1;
  isFinanceLoading = false;
  
  get financePageRange(): number[] {
    const range: number[] = [];
    for (let i = 1; i <= this.financeTotalPages; i++) {
      range.push(i);
    }
    return range;
  }
  
  // Assets state
  allAssets: any[] = [];
  paginatedAssets: any[] = [];
  assetsCurrentPage = 1;
  assetsTotalRecords = 0;
  assetsTotalPages = 1;
  isAssetsLoading = false;
  
  get assetsPageRange(): number[] {
    const range: number[] = [];
    for (let i = 1; i <= this.assetsTotalPages; i++) {
      range.push(i);
    }
    return range;
  }

  // Performance State
  managerAppraisals: any[] = [];
  isPerformanceLoading = false;

  // News State
  latestNews: any[] = [];
  isNewsLoading = false;

  // Holiday State
  upcomingHolidays: any[] = [];
  isHolidaysLoading = false;

  // Clock in/out state
  currentSession: TimeTrackingSession | null = null;
  isClockActionLoading = false;
  currentTime = new Date();
  
  readonly currencySymbol = signal(this.settingsService.getCurrencySymbol());

  activeTab: 'financial' | 'recruitment' | 'performance' | 'assets' = 'financial';

  // All sections visible — permissions will be applied later
  readonly showAll = true;

  // ── Computed helpers ────────────────────────────────────────────────────────
  get leaveBalanceSummary(): string {
    const types = this.employeeData?.leaveBalances?.byType ?? [];
    return types.map((t) => `${t.leaveTypeName} (${t.remainingDays})`).join(' • ') || '—';
  }

  get totalLoanAdvance(): number {
    const d = this.employeeData?.activeLoansAndAdvances;
    return (d?.totalRemainingLoanAmount ?? 0) + (d?.totalRemainingAdvanceAmount ?? 0);
  }

  get pendingRequestCount(): number {
    return this.employeeData?.pendingRequests?.length ?? 0;
  }

  get teamAttendanceSummary(): string {
    const s = this.managerData?.teamAttendanceSnapshot;
    if (!s) return '—';
    return `${s.absentCount} Absent • ${s.onLeaveCount} On Leave • ${s.lateCount} Late`;
  }

  get managerPendingTotal(): number {
    const a = this.managerData?.pendingActions;
    return (a?.pendingLeaveRequests ?? 0) + (a?.pendingTimesheetCorrections ?? 0) + (a?.pendingShiftSwaps ?? 0);
  }

  get managerActionSummary(): string {
    const a = this.managerData?.pendingActions;
    if (!a) return '—';
    return `Leaves (${a.pendingLeaveRequests}) • Timesheets (${a.pendingTimesheetCorrections}) • Swaps (${a.pendingShiftSwaps})`;
  }

  get payrollStatusLabel(): string {
    const p = this.hrOverviewData?.latestPayrollRun;
    if (!p) return '—';
    if (p.isFullyCompleted) return 'Completed';
    if (p.payslipsGenerated === 0) return 'Processing';
    return 'In Progress';
  }

  get payrollStatusDetail(): string {
    const p = this.hrOverviewData?.latestPayrollRun;
    if (!p) return '';
    return `PDFs: ${p.payslipsGenerated}/${p.totalEmployeesProcessed} • Uploaded: ${p.payslipsUploaded} • Mails: ${p.emailsSent}`;
  }

  get genderLabel(): string {
    const d = this.hrStatsData?.demographics;
    if (!d) return '—';
    return `${d.malePercentage.toFixed(0)}% M / ${d.femalePercentage.toFixed(0)}% F`;
  }

  get primaryAgeGroup(): string {
    const ag = this.hrStatsData?.demographics?.ageGroupPercentages;
    if (!ag || Object.keys(ag).length === 0) return '—';
    const max = Object.entries(ag).sort((a, b) => b[1] - a[1])[0];
    return max ? `${max[0]} Primary` : '—';
  }

  get largestDeptLabel(): string {
    const d = this.hrStatsData?.demographics;
    if (!d) return '—';
    return `${d.largestDepartmentName} (${d.largestDepartmentPercentage.toFixed(0)}%)`;
  }

  get donutGradient(): string {
    const d = this.hrStatsData?.demographics;
    if (!d) return 'conic-gradient(#94a3b8 0% 100%)';
    const male = d.malePercentage;
    const female = d.femalePercentage;
    return `conic-gradient(#2563eb 0% ${male}%, #10b981 ${male}% ${male + female}%, #f59e0b ${male + female}% 100%)`;
  }

  get payrollChartItems(): { label: string; basic: number; deductions: number; bonus: number; maxVal: number }[] {
    const items = this.hrStatsData?.payrollOutflow ?? [];
    const maxVal = Math.max(...items.map((i) => i.basicSalarySum), 1);
    return items.slice(-3).map((i) => ({
      label: i.periodName,
      basic: i.basicSalarySum,
      deductions: i.totalDeductionsSum,
      bonus: i.totalBonusesSum,
      maxVal
    }));
  }

  get expenseChartItems(): { label: string; amount: number; maxVal: number }[] {
    const items = this.hrStatsData?.monthlyExpenses ?? [];
    const maxVal = Math.max(...items.map((i) => i.totalExpense), 1);
    return items.slice(-3).map((i) => ({
      label: i.month,
      amount: i.totalExpense,
      maxVal
    }));
  }

  ngOnInit(): void {
    // Start live clock
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime = new Date();
        this.cdr.markForCheck();
      });

    // Start hire rotation (every 30s)
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.latestHires && this.latestHires.length > 1) {
          this.isHireAnimating = true;
          this.cdr.markForCheck();
          
          setTimeout(() => {
            this.currentHireIndex = (this.currentHireIndex + 1) % this.latestHires.length;
            this.isHireAnimating = false;
            this.cdr.markForCheck();
          }, 300); // 300ms transition time
        }
      });

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.currentUser = user;
        this.loadData();
        this.loadCurrentSession();
        this.loadFinancialRequests(1);
        this.loadDashboardAssets();
        this.loadManagerAppraisals();
        this.loadLatestNews();
        this.loadUpcomingHolidays();
        this.loadCurrencySymbol();
      });
  }

  private loadCurrencySymbol(): void {
    this.settingsService.getOrganizationCurrency()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (currencyCode: any) => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol(currencyCode));
        },
        error: () => {
          this.currencySymbol.set(this.settingsService.getCurrencySymbol());
        }
      });
  }

  private loadCurrentSession(): void {
    this.attendanceService.getCurrentSession()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (session) => {
          this.currentSession = session;
          this.cdr.markForCheck();
        },
        error: () => {
          this.currentSession = null;
          this.cdr.markForCheck();
        }
      });
  }

  loadFinancialRequests(page: number = 1): void {
    this.isFinanceLoading = true;
    this.financeCurrentPage = page;
    
    const pendingLoans$ = this.payrollService.getAllLoans({ Status: 'pending', Page: page, PageSize: 5 }).pipe(
      map(res => res?.data || {}),
      catchError(() => of({}))
    );
    
    const pendingAdvances$ = this.payrollService.getAllSalaryAdvanceRequests({ Status: 'pending', Page: page, PageSize: 5 }).pipe(
      map(res => res?.data || {}),
      catchError(() => of({}))
    );

    forkJoin({ loansData: pendingLoans$, advancesData: pendingAdvances$ })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ loansData, advancesData }) => {
        const loans = loansData?.data || loansData || [];
        const advances = advancesData?.data || advancesData || [];
        
        const formattedLoans = (Array.isArray(loans) ? loans : []).map(l => ({
          ...l,
          requestType: 'Loan',
          dateValue: new Date(l.createdAt || l.updatedAt || new Date()).getTime(),
          amountToDisplay: l.totalAmount
        }));
        
        const formattedAdvances = (Array.isArray(advances) ? advances : []).map(a => ({
          ...a,
          requestType: 'Salary Advance',
          dateValue: new Date(a.createdAt || a.updatedAt || new Date()).getTime(),
          amountToDisplay: a.amount
        }));

        this.combinedFinancialRequests = [...formattedLoans, ...formattedAdvances]
          .sort((a, b) => b.dateValue - a.dateValue);
          
        const loansTotal = loansData?.totalRecords || loans.length || 0;
        const advancesTotal = advancesData?.totalRecords || advances.length || 0;
        this.financeTotalRecords = loansTotal + advancesTotal;
        
        const loansPages = loansData?.totalPages || 1;
        const advancesPages = advancesData?.totalPages || 1;
        this.financeTotalPages = Math.max(loansPages, advancesPages, 1);
        
        this.isFinanceLoading = false;
        this.cdr.markForCheck();
      });
  }

  nextFinancePage(): void {
    if (this.financeCurrentPage < this.financeTotalPages) {
      this.loadFinancialRequests(this.financeCurrentPage + 1);
    }
  }

  prevFinancePage(): void {
    if (this.financeCurrentPage > 1) {
      this.loadFinancialRequests(this.financeCurrentPage - 1);
    }
  }

  goToFinancePage(page: number): void {
    if (page >= 1 && page <= this.financeTotalPages && page !== this.financeCurrentPage) {
      this.loadFinancialRequests(page);
    }
  }

  loadDashboardAssets(): void {
    this.isAssetsLoading = true;
    this.assetsService.getAll$().pipe(takeUntil(this.destroy$)).subscribe({
      next: (assets) => {
        this.allAssets = assets || [];
        this.assetsTotalRecords = this.allAssets.length;
        this.assetsTotalPages = Math.ceil(this.assetsTotalRecords / 5) || 1;
        this.updateAssetsPagination();
        this.isAssetsLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isAssetsLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  updateAssetsPagination(): void {
    const start = (this.assetsCurrentPage - 1) * 5;
    this.paginatedAssets = this.allAssets.slice(start, start + 5);
  }

  nextAssetsPage(): void {
    if (this.assetsCurrentPage < this.assetsTotalPages) {
      this.assetsCurrentPage++;
      this.updateAssetsPagination();
    }
  }

  prevAssetsPage(): void {
    if (this.assetsCurrentPage > 1) {
      this.assetsCurrentPage--;
      this.updateAssetsPagination();
    }
  }

  goToAssetsPage(page: number): void {
    if (page >= 1 && page <= this.assetsTotalPages && page !== this.assetsCurrentPage) {
      this.assetsCurrentPage = page;
      this.updateAssetsPagination();
    }
  }

  getAssetAssignedToDisplay(asset: any): string {
    if (!asset) return 'Not Assigned';
    const employeeName = asset.employeeName || asset.EmployeeName || asset.assignedEmployeeName || asset.currentAssigneeName;
    return employeeName ? employeeName : 'Not Assigned';
  }

  loadManagerAppraisals(): void {
    if (!this.currentUser?.employeeId) return;
    
    this.isPerformanceLoading = true;
    this.performanceService.getEmployeeAppraisals({ managerId: this.currentUser.employeeId, status: AppraisalStatus.SUBMITTED }, 1, 6)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.managerAppraisals = res?.data?.items || [];
          this.isPerformanceLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isPerformanceLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadLatestNews(): void {
    this.isNewsLoading = true;
    this.newsService.getAllNews({ page: 1, pageSize: 3, status: 'Published' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.latestNews = res?.data || [];
          this.isNewsLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isNewsLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadUpcomingHolidays(): void {
    const currentYear = new Date().getFullYear();
    this.isHolidaysLoading = true;
    
    this.holidayService.getCompanyHolidays(currentYear)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (holidays) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          this.upcomingHolidays = holidays
            .filter(h => new Date(h.holidayDate) >= today)
            .sort((a, b) => new Date(a.holidayDate).getTime() - new Date(b.holidayDate).getTime())
            .slice(0, 2);
            
          this.isHolidaysLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.isHolidaysLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  goToAppraisals(): void {
    this.router.navigate(['/performance/appraisals']);
  }

  reviewRequest(req: any): void {
    if (req.requestType === 'Loan') {
      this.router.navigate(['/payroll/loans']);
    } else if (req.requestType === 'Salary Advance') {
      this.router.navigate(['/payroll/salary-advances']);
    }
  }

  private loadData(): void {
    this.isLoading = true;

    // Fetch all APIs regardless of role — permissions will be applied later
    const employee$: Observable<EmployeeOverview | null> = this.dashboardService.getEmployeeOverview().pipe(
      map((res) => res?.data ?? null),
      catchError(() => of<EmployeeOverview | null>(null))
    );

    const manager$: Observable<ManagerOverview | null> = this.dashboardService.getManagerOverview().pipe(
      map((res) => res?.data ?? null),
      catchError(() => of<ManagerOverview | null>(null))
    );

    const hrOverview$: Observable<HrOverview | null> = this.dashboardService.getHrOverview().pipe(
      map((res) => res?.data ?? null),
      catchError(() => of<HrOverview | null>(null))
    );

    const hrStats$: Observable<HrStats | null> = this.dashboardService.getHrStats().pipe(
      map((res) => res?.data ?? null),
      catchError(() => of<HrStats | null>(null))
    );

    const latestHires$: Observable<LatestHiredEmployee[]> = this.dashboardService.getLatestHires().pipe(
      map((res) => res?.data ?? []),
      catchError(() => of<LatestHiredEmployee[]>([]))
    );

    forkJoin({
      emp: employee$,
      mgr: manager$,
      hrOvw: hrOverview$,
      hrSts: hrStats$,
      hires: latestHires$
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ emp, mgr, hrOvw, hrSts, hires }) => {
        this.employeeData   = emp;
        this.managerData    = mgr;
        this.hrOverviewData = hrOvw;
        this.hrStatsData    = hrSts;
        this.latestHires    = hires;
        
        this.isLoading = false;
        this.cdr.markForCheck();
      });
  }


  setActiveTab(tab: 'financial' | 'recruitment' | 'performance' | 'assets'): void {
    this.activeTab = tab;
  }

  // ── Clock In / Clock Out Logic ──────────────────────────────────────────
  clockIn(): void {
    void this.clockViaGeoEndpoint('in');
  }

  clockOut(): void {
    const dialogRef = this.dialog.open(CommentDialogComponent, {
      width: '400px',
      panelClass: 'attendance-dialog-panel',
      data: { title: 'Clock Out', label: 'Day Updates / Comments', placeholder: 'E.g., completed API integration...', required: false }
    });
    dialogRef.afterClosed().subscribe(comment => {
      if (comment === undefined) return;
      void this.clockViaGeoEndpoint('out', comment);
    });
  }

  private getBrowserLocation(): Promise<{ latitude?: number; longitude?: number }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({});
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        () => resolve({}),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  private clockViaGeoEndpoint(action: 'in' | 'out', notes?: string): void {
    this.isClockActionLoading = true;
    this.cdr.markForCheck();

    this.getBrowserLocation().then(location => {
      const request: GeoClockInRequest = {
        action,
        ...location,
        notes,
        matchResult: 'match',
        deviceInfo: JSON.stringify({
          userAgent: navigator.userAgent.substring(0, 200),
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        })
      };

      this.geoFenceService.geoClock(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.notification.showSuccess(response.message || `Clocked ${action === 'in' ? 'in' : 'out'} successfully!`);
            this.loadCurrentSession(); // Refresh session state
            this.isClockActionLoading = false;
            this.cdr.markForCheck();
          },
          error: (e) => {
            this.notification.showError(e?.error?.message || `Failed to clock ${action === 'in' ? 'in' : 'out'}.`);
            this.isClockActionLoading = false;
            this.cdr.markForCheck();
          }
        });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
