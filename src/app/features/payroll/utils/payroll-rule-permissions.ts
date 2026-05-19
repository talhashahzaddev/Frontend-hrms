import { AuthService } from '@core/services/auth.service';
import { filter, Subscription } from 'rxjs';

const PAYROLL_MENU = 'Payroll';
const RULES_SUBMENU = 'Rules';

export interface PayrollPolicyOption {
  id: number;
  name: string;
}

export const PAYROLL_POLICIES: PayrollPolicyOption[] = [
  { id: 1, name: 'Overtime Policy' },
  { id: 2, name: 'Attendance Deduction Policy' },
  { id: 3, name: 'Late Arrival Policy' },
  { id: 4, name: 'Leave Deduction Policy' },
  { id: 5, name: 'Performance Bonus Policy' },
  { id: 6, name: 'Bonus' },
  { id: 7, name: 'Employee Loan Policy' },
  { id: 8, name: 'Salary Advance Policy' },
  { id: 9, name: 'Provident Fund Policy' },
  { id: 10, name: 'Tax regime Policy' },
  { id: 11, name: 'Social Security Policy' },
  { id: 12, name: 'Gratuity Policy' }
];

/** Permission key prefix per policy id (used with _view, _add, _edit, _delete). */
const POLICY_PERMISSION_PREFIX: Record<number, string> = {
  1: 'overtime_rule',
  2: 'attendance_deduction_rule',
  3: 'late_arrival_rule',
  4: 'leave_deduction_rule',
  5: 'performance_rule',
  6: 'bonus_rule',
  7: 'loan_rule',
  8: 'salary_advance_rule',
  9: 'provident_fund_rule',
  10: 'tax_regime',
  11: 'social_security_rule',
  12: 'gratuity_rule'
};

export const PAYROLL_POLICY_VIEW_KEYS: Record<string, string> = {
  overtimePolicy: 'overtime_rule_view',
  attendanceDeductionPolicy: 'attendance_deduction_rule_view',
  lateArrivalPolicy: 'late_arrival_rule_view',
  leaveDeductionPolicy: 'leave_deduction_rule_view',
  performanceBonusPolicy: 'performance_rule_view',
  bonusPolicy: 'bonus_rule_view',
  employeeLoanPolicy: 'loan_rule_view',
  providentFundPolicy: 'provident_fund_rule_view',
  salaryAdvancePolicy: 'salary_advance_rule_view',
  incomeTaxPolicy: 'tax_regime_view',
  socialSecurityPolicy: 'social_security_rule_view',
  gratuityPolicy: 'gratuity_rule_view'
};

export const PAYROLL_POLICY_ADD_KEYS: string[] = [
  'overtime_rule_add',
  'attendance_deduction_rule_add',
  'late_arrival_rule_add',
  'leave_deduction_rule_add',
  'performance_rule_add',
  'bonus_rule_add',
  'loan_rule_add',
  'salary_advance_rule_add',
  'provident_fund_rule_add',
  'tax_regime_add',
  'social_security_rule_add',
  'gratuity_rule_add'
];

export function getPolicyPermissionKey(
  policyId: number,
  action: 'view' | 'add' | 'edit' | 'delete'
): string | null {
  const prefix = POLICY_PERMISSION_PREFIX[policyId];
  if (!prefix) {
    return null;
  }
  return `${prefix}_${action}`;
}

export function hasPayrollRulePermission(authService: AuthService, actionKey: string): boolean {
  // Prefer global action-key lookup (handles duplicate "Rules" submenus in permission data).
  if (authService.hasPermissionByActionKey(actionKey)) {
    return true;
  }
  return authService.hasMenuPermission(PAYROLL_MENU, RULES_SUBMENU, actionKey);
}

export function canAddPayrollPolicy(authService: AuthService, policyId: number): boolean {
  const key = getPolicyPermissionKey(policyId, 'add');
  return key ? hasPayrollRulePermission(authService, key) : false;
}

export function canEditPayrollPolicy(authService: AuthService, policyId: number): boolean {
  const key = getPolicyPermissionKey(policyId, 'edit');
  return key ? hasPayrollRulePermission(authService, key) : false;
}

export function getCreatablePolicies(authService: AuthService): PayrollPolicyOption[] {
  return PAYROLL_POLICIES.filter(policy => canAddPayrollPolicy(authService, policy.id));
}

export function canCreateAnyPayrollPolicy(authService: AuthService): boolean {
  return PAYROLL_POLICY_ADD_KEYS.some(key => hasPayrollRulePermission(authService, key));
}

/** Waits for permissions and loads rule data once view access is granted. */
export function watchPayrollRuleViewAccess(
  authService: AuthService,
  viewActionKey: string,
  callbacks: {
    onAllowed: () => void;
    onDenied: () => void;
  }
): Subscription {
  let loadStarted = false;
  let accessResolved = false;

  return authService.permissions$
    .pipe(filter(p => p !== null))
    .subscribe(() => {
      const allowed = hasPayrollRulePermission(authService, viewActionKey);
      if (allowed) {
        accessResolved = true;
        if (!loadStarted) {
          loadStarted = true;
          callbacks.onAllowed();
        }
        return;
      }

      // Only treat as denied after permissions are loaded; avoid flashing denied while cache refreshes.
      if (!accessResolved && !loadStarted) {
        accessResolved = true;
        callbacks.onDenied();
      }
    });
}
