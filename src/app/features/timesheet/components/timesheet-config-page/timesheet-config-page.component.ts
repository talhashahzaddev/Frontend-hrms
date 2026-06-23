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
      <app-page-header title="Timesheet Configuration"></app-page-header>

      @if (loading) {
        <div class="ts-loading"><p-progressSpinner></p-progressSpinner></div>
      } @else {
        <div class="ts-config-section">
          <h3 class="ts-section-title">Workflow Settings</h3>
          <div class="ts-card">
            <div class="ts-form-group">
              <div class="ts-switch-row">
                <span class="ts-switch-label">Require Manager Approval</span>
                <p-inputSwitch [(ngModel)]="config.requiresManagerApproval"></p-inputSwitch>
              </div>
            </div>
            <div class="ts-form-group">
              <div class="ts-switch-row">
                <span class="ts-switch-label">Allow Employee Corrections</span>
                <p-inputSwitch [(ngModel)]="config.allowEmployeeCorrections"></p-inputSwitch>
              </div>
            </div>
            <div class="ts-form-group">
              <label class="ts-label">Correction Deadline (days)</label>
              <p-inputNumber [(ngModel)]="config.correctionDeadlineDays" [min]="0" mode="decimal" [style]="{'width': '120px'}"></p-inputNumber>
            </div>
          </div>
        </div>

        <div class="ts-config-section">
          <h3 class="ts-section-title">Calculation Thresholds</h3>
          <div class="ts-card">
            <div class="ts-form-row">
              <div class="ts-form-group ts-half">
                <label class="ts-label">Full Day Hours</label>
                <p-inputNumber [(ngModel)]="config.fullDayThresholdHours" [min]="0.5" [max]="24" [step]="0.5" mode="decimal" [style]="{'width': '120px'}"></p-inputNumber>
              </div>
              <div class="ts-form-group ts-half">
                <label class="ts-label">Half Day Hours</label>
                <p-inputNumber [(ngModel)]="config.halfDayThresholdHours" [min]="0.5" [step]="0.5" mode="decimal" [style]="{'width': '120px'}"></p-inputNumber>
              </div>
            </div>
            <div class="ts-form-group">
              <label class="ts-label">Late Grace Minutes</label>
              <p-inputNumber [(ngModel)]="config.lateGraceMinutes" [min]="0" [max]="120" mode="decimal" [style]="{'width': '120px'}"></p-inputNumber>
            </div>
          </div>
        </div>

        <div class="ts-config-section">
          <h3 class="ts-section-title">Overtime Multipliers</h3>
          <div class="ts-card">
            <div class="ts-form-row">
              <div class="ts-form-group ts-third">
                <label class="ts-label">Regular OT Multiplier</label>
                <p-inputNumber [(ngModel)]="config.overtimeMultiplierRegular" [min]="1.0" [step]="0.05" mode="decimal" [style]="{'width': '120px'}"></p-inputNumber>
              </div>
              <div class="ts-form-group ts-third">
                <label class="ts-label">Weekend OT Multiplier</label>
                <p-inputNumber [(ngModel)]="config.overtimeMultiplierWeekend" [min]="1.0" [step]="0.05" mode="decimal" [style]="{'width': '120px'}"></p-inputNumber>
              </div>
              <div class="ts-form-group ts-third">
                <label class="ts-label">Holiday OT Multiplier</label>
                <p-inputNumber [(ngModel)]="config.overtimeMultiplierHoliday" [min]="1.0" [step]="0.05" mode="decimal" [style]="{'width': '120px'}"></p-inputNumber>
              </div>
            </div>
          </div>
        </div>

        @if (saved) { <p-message severity="success" text="Configuration saved successfully!"></p-message> }
        @if (error()) { <p-message severity="error" [text]="error()"></p-message> }

        <div style="margin-top: var(--ts-space-4);">
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
