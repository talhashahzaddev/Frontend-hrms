import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimesheetService } from '../../services/timesheet.service';
import { TimesheetConfig } from '../../models/timesheet.models';
import { AuthService } from '../../../../core/services/auth.service';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-timesheet-config-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ButtonModule, InputNumberModule, InputSwitchModule, ProgressSpinnerModule, MessageModule, PageHeaderComponent],
  template: `
    <div class="ts-page-layout">
      <app-page-header matIcon="settings" title="Timesheet Configuration" subtitle="Workflow rules, thresholds, and overtime multipliers"></app-page-header>

      @if (loading) {
        <div class="ts-loading"><p-progressSpinner></p-progressSpinner></div>
      } @else {
        <div class="ts-config-section" style="margin-bottom: 2rem;">
          <h3 class="ts-section-title" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
            <div style="background: #eff6ff; color: #2563eb; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
              <i class="pi pi-sliders-h"></i>
            </div>
            Workflow Settings
          </h3>
          <div class="ts-card">
            <div class="ts-form-group">
              <div class="ts-switch-row" style="padding: 0.5rem 0;">
                <span class="ts-switch-label" style="color: #334155; font-weight: 500;">Require Manager Approval</span>
                <p-inputSwitch [(ngModel)]="config.requiresManagerApproval"></p-inputSwitch>
              </div>
            </div>
            <div class="ts-form-group">
              <div class="ts-switch-row" style="padding: 0.5rem 0;">
                <span class="ts-switch-label" style="color: #334155; font-weight: 500;">Allow Employee Corrections</span>
                <p-inputSwitch [(ngModel)]="config.allowEmployeeCorrections"></p-inputSwitch>
              </div>
            </div>
            <div class="ts-form-group" style="margin-top: 1rem; max-width: 300px;">
              <label class="ts-label" style="color: #475569;">Correction Deadline (days)</label>
              <p-inputNumber [(ngModel)]="config.correctionDeadlineDays" [min]="0" mode="decimal" [style]="{'width': '100%'}"></p-inputNumber>
            </div>
          </div>
        </div>

        <div class="ts-config-section" style="margin-bottom: 2rem;">
          <h3 class="ts-section-title" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
            <div style="background: #eff6ff; color: #2563eb; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
              <i class="pi pi-clock"></i>
            </div>
            Calculation Thresholds
          </h3>
          <div class="ts-card">
            <div class="ts-form-row">
              <div class="ts-form-group ts-half">
                <label class="ts-label" style="color: #475569;">Full Day Hours</label>
                <p-inputNumber [(ngModel)]="config.fullDayThresholdHours" [min]="0.5" [max]="24" [step]="0.5" mode="decimal" [style]="{'width': '100%'}"></p-inputNumber>
              </div>
              <div class="ts-form-group ts-half">
                <label class="ts-label" style="color: #475569;">Half Day Hours</label>
                <p-inputNumber [(ngModel)]="config.halfDayThresholdHours" [min]="0.5" [step]="0.5" mode="decimal" [style]="{'width': '100%'}"></p-inputNumber>
              </div>
            </div>
            <div class="ts-form-group" style="max-width: 300px;">
              <label class="ts-label" style="color: #475569;">Late Grace Minutes</label>
              <p-inputNumber [(ngModel)]="config.lateGraceMinutes" [min]="0" [max]="120" mode="decimal" [style]="{'width': '100%'}"></p-inputNumber>
            </div>
          </div>
        </div>

        <div class="ts-config-section" style="margin-bottom: 2rem;">
          <h3 class="ts-section-title" style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
            <div style="background: #eff6ff; color: #2563eb; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
              <i class="pi pi-percentage"></i>
            </div>
            Overtime Multipliers
          </h3>
          <div class="ts-card">
            <div class="ts-form-row">
              <div class="ts-form-group ts-third">
                <label class="ts-label" style="color: #475569;">Regular OT Multiplier</label>
                <p-inputNumber [(ngModel)]="config.overtimeMultiplierRegular" [min]="1.0" [step]="0.05" mode="decimal" [style]="{'width': '100%'}"></p-inputNumber>
              </div>
              <div class="ts-form-group ts-third">
                <label class="ts-label" style="color: #475569;">Weekend OT Multiplier</label>
                <p-inputNumber [(ngModel)]="config.overtimeMultiplierWeekend" [min]="1.0" [step]="0.05" mode="decimal" [style]="{'width': '100%'}"></p-inputNumber>
              </div>
              <div class="ts-form-group ts-third">
                <label class="ts-label" style="color: #475569;">Holiday OT Multiplier</label>
                <p-inputNumber [(ngModel)]="config.overtimeMultiplierHoliday" [min]="1.0" [step]="0.05" mode="decimal" [style]="{'width': '100%'}"></p-inputNumber>
              </div>
            </div>
          </div>
        </div>

        @if (saved) { <p-message severity="success" text="Configuration saved successfully!" [ngStyle]="{'margin-bottom': '1rem', 'display': 'block'}"></p-message> }
        @if (error()) { <p-message severity="error" [text]="error()" [ngStyle]="{'margin-bottom': '1rem', 'display': 'block'}"></p-message> }

        <div style="margin-top: var(--ts-space-4); display: flex; justify-content: flex-end;">
          @if (canEdit) {
            <p-button label="Save Configuration" icon="pi pi-save" [loading]="saving()" (click)="save()"></p-button>
          } @else {
            <p-message severity="warn" text="You don't have permission to edit configuration."></p-message>
          }
        </div>
      }
    </div>
  `,
  styleUrls: ['./timesheet-config-page.component.scss']
})
export class TimesheetConfigPageComponent implements OnInit {
  config!: TimesheetConfig;
  loading = true;
  saving = signal(false);
  saved = false;
  error = signal('');

  private authService = inject(AuthService);

  get canEdit(): boolean {
    return this.authService.hasPermissionByActionKey('timesheet_config_edit');
  }

  constructor(private api: TimesheetService) {}

  ngOnInit() {
    this.api.getConfig().subscribe({
      next: (c) => { this.config = { ...c }; this.loading = false; },
      error: () => { this.loading = false; this.error.set('Failed to load config.'); }
    });
  }

  save() {
    this.saving.set(true);
    this.saved = false;
    this.error.set('');
    this.api.updateConfig(this.config).subscribe({
      next: () => { this.saving.set(false); this.saved = true; },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.errorMessage || 'Failed to save config.');
      }
    });
  }
}
