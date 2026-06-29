
import { takeUntil } from 'rxjs';
import { Component, ChangeDetectionStrategy, Inject ,OnInit, OnDestroy} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NotificationService } from '../../../../core/services/notification.service';
import { AttendanceService } from '../../services/attendance.service';
import { OverlayModule, OverlayContainer } from '@angular/cdk/overlay';
import { UpdateShiftDto } from '../../../../../app/core/models/attendance.models';
import { ChangeDetectorRef } from '@angular/core';
import { MatNativeDateModule } from '@angular/material/core';
import { SettingsService } from '@/app/features/settings/services/settings.service';
import { Observable, Subject, of, switchMap } from 'rxjs';
import { GeoFenceService, GeoFenceDto } from '../../services/geofence.service';
import { ShiftDto } from '@/app/core/models/attendance.models';

import { SharedCommonModule } from '@shared/shared-common.module';
declare const L: any;


@Component({
  selector: 'app-create-shift',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatNativeDateModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    OverlayModule,
    MatSlideToggleModule
  ],
  templateUrl: './create-shift.component.html',
  styleUrls: ['./create-shift.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateShiftComponent  implements OnInit,OnDestroy {
  shiftForm: FormGroup;
  isSubmitting = false;
  isEditMode = false;
  shiftId: string = '';
  userRole: string = '';
  timezone: { value: string; label: string }[] = [];
  timeSlots: Array<{ value: string; label: string }> = [];
  organizationTimeZone: string = 'UTC';
private destroy$ = new Subject<void>();
  fences: GeoFenceDto[] = [];
  selectedFence: GeoFenceDto | null = null;
  private currentGeoFenceId = '';
  private fencePreviewMap: any;
  private fencePreviewCircle: any;
  days = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 0, label: 'Sunday' }
  ];
  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateShiftComponent>,
    private attendanceService: AttendanceService,
    private overlayContainer: OverlayContainer,
    private  settingsService: SettingsService,
    private geoFenceService: GeoFenceService,
    private cdr: ChangeDetectorRef,
    private notification: NotificationService,
    @Inject(MAT_DIALOG_DATA) public data?: any,
  ) {
    this.shiftForm = this.fb.group({
      shiftName: ['', [Validators.required, Validators.minLength(3)]],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      breakDuration: [0, [Validators.min(0)]],
      daysofWeek: [[], Validators.required],
      timezone: [''],
      marginHours: [0, [Validators.min(0), Validators.max(5)]],
      applyMarginhours: [],
      // Per-shift grace period (minutes). Used by timesheet late calc when set; falls
      // back to the payroll late-arrival rule, then a 15-minute default, when 0.
      graceMinutes: [0, [Validators.min(0), Validators.max(120)]],
      geoFenceId: ['']
    });

    if (data) {
      this.isEditMode = true;
      this.shiftId = data.shiftId;
      this.patchForm(data);
    }
  }
ngOnInit(): void {
  this.timeSlots = this.buildTimeSlots(15);
   this.loadInitialData();
   this.loadGeoFences();
   if (this.isEditMode) {
     this.loadShiftGeoFence();
   }

   this.shiftForm.get('geoFenceId')?.valueChanges
     .pipe(takeUntil(this.destroy$))
     .subscribe((geoFenceId: string) => {
       if (!geoFenceId) {
         this.selectedFence = null;
         this.renderFencePreview();
         return;
       }

       const matchedFence = this.fences.find(f => f.geoFenceId === geoFenceId);
       if (matchedFence) {
         this.selectedFence = matchedFence;
       } else if (this.selectedFence?.geoFenceId !== geoFenceId) {
         this.selectedFence = null;
       }

       this.renderFencePreview();
     });
}

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
  if (this.fencePreviewMap) {
    this.fencePreviewMap.remove();
    this.fencePreviewMap = null;
  }
}

  private patchForm(data: any): void {
    this.shiftForm.patchValue({
      shiftName: data.shiftName,
      startTime: data.startTime?.substring(0, 5),
      endTime: data.endTime?.substring(0, 5),
      breakDuration: data.breakDuration,
      daysofWeek: data.daysofWeek,
      timezone: data.timezone,
      marginHours: data.marginHours ?? 0,
      applyMarginhours: data.applyMarginhours ?? true,
      graceMinutes: data.graceMinutes ?? 0,
      geoFenceId: data.geoFenceId ?? ''


    });
  }

  private loadShiftGeoFence(): void {
    this.geoFenceService.getByShift(this.shiftId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (linkedFences) => {
          const linkedFence = (linkedFences || [])[0] || null;

          this.currentGeoFenceId = linkedFence?.geoFenceId || '';

          if (linkedFence) {
            this.selectedFence = linkedFence as unknown as GeoFenceDto;
            this.ensureSelectedFenceIsAvailable(this.selectedFence);
            this.shiftForm.patchValue({
              geoFenceId: this.currentGeoFenceId
            });
          } else {
            this.selectedFence = null;
            this.shiftForm.patchValue({
              geoFenceId: ''
            });
          }

          this.cdr.markForCheck();
          this.renderFencePreview();
        },
        error: () => {
          this.currentGeoFenceId = '';
          this.selectedFence = null;
          this.shiftForm.patchValue({
            geoFenceId: ''
          });
          this.cdr.markForCheck();
          this.renderFencePreview();
        }
      });
  }

  private ensureSelectedFenceIsAvailable(fence: GeoFenceDto): void {
    if (!fence?.geoFenceId) return;
    if (this.fences.some(existing => existing.geoFenceId === fence.geoFenceId)) return;

    this.fences = [fence, ...this.fences];
  }

  private buildTimeSlots(intervalMinutes: number): Array<{ value: string; label: string }> {
    const slots: Array<{ value: string; label: string }> = [];

    for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += intervalMinutes) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const hour12 = hours % 12 === 0 ? 12 : hours % 12;
      const period = hours < 12 ? 'AM' : 'PM';
      const value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      const label = `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;

      slots.push({ value, label });
    }

    return slots;
  }

  private loadGeoFences(): void {
    this.geoFenceService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fences) => {
          this.fences = (fences || []).filter(f => f.isActive);
          this.cdr.markForCheck();
          setTimeout(() => this.initFencePreviewMap(), 0);
        },
        error: () => {
          this.fences = [];
          this.cdr.markForCheck();
        }
      });
  }

  private initFencePreviewMap(): void {
    const mapContainer = document.getElementById('createShiftFencePreviewMap');
    if (!mapContainer) return;
    if (typeof L === 'undefined') {
      setTimeout(() => this.initFencePreviewMap(), 200);
      return;
    }

    if (this.fencePreviewMap) {
      this.fencePreviewMap.remove();
      this.fencePreviewMap = null;
    }

    this.fencePreviewMap = L.map(mapContainer, {
      center: [31.5204, 74.3587],
      zoom: 12,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.fencePreviewMap);

    this.renderFencePreview();
  }

  private renderFencePreview(): void {
    if (!this.fencePreviewMap) return;

    if (this.fencePreviewCircle) {
      this.fencePreviewMap.removeLayer(this.fencePreviewCircle);
      this.fencePreviewCircle = null;
    }

    if (!this.selectedFence?.centerLatitude || !this.selectedFence?.centerLongitude) {
      this.fencePreviewMap.setView([31.5204, 74.3587], 12);
      return;
    }

    this.fencePreviewCircle = L.circle([
      this.selectedFence.centerLatitude,
      this.selectedFence.centerLongitude
    ], {
      radius: this.selectedFence.radiusMeters || 200,
      color: '#2563eb',
      fillColor: '#2563eb',
      fillOpacity: 0.2,
      weight: 2
    }).addTo(this.fencePreviewMap);

    this.fencePreviewMap.setView([
      this.selectedFence.centerLatitude,
      this.selectedFence.centerLongitude
    ], 15);
  }

  private resolveShiftIdFromCreateResponse(response: any, formValue: any): Promise<string | null> {
    const direct = response?.data?.shiftId || response?.data || response?.shiftId || response?.id;
    if (typeof direct === 'string' && direct.trim()) {
      return Promise.resolve(direct);
    }

    return new Promise((resolve) => {
      this.attendanceService.getShifts().subscribe({
        next: (shifts: ShiftDto[]) => {
          const candidates = (shifts || []).filter(s =>
            (s.shiftName || '').trim().toLowerCase() === (formValue.shiftName || '').trim().toLowerCase() &&
            (s.startTime || '').startsWith(formValue.startTime || '') &&
            (s.endTime || '').startsWith(formValue.endTime || '')
          );

          resolve(candidates.length ? candidates[candidates.length - 1].shiftId : null);
        },
        error: () => resolve(null)
      });
    });
  }

private loadInitialData(): void {

  this.settingsService.getOrganizationSettings()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (settings) => {

        this.organizationTimeZone = settings.timeZone || 'UTC';

        // ⭐ IMPORTANT: form control me set karo
        this.shiftForm.patchValue({
          timezone: this.organizationTimeZone
        });

        this.cdr.markForCheck();

      },
      error: (error) => {
        console.error('Error loading organization timezone:', error);

        this.organizationTimeZone = 'UTC';

        this.shiftForm.patchValue({
          timezone: 'UTC'
        });

        this.cdr.markForCheck();
      }
    });
}


  onSubmit(): void {
    if (!this.shiftForm.valid) {
      this.markFormGroupTouched(this.shiftForm);
      this.notification.showError('Please correct the highlighted fields');
      return;
    }
    this.isSubmitting = true;

    const formValue = this.shiftForm.value;

    if (this.isEditMode) {
      const updateDto: UpdateShiftDto = {
        shiftId: this.shiftId,
        shiftName: formValue.shiftName,
        startTime: formValue.startTime ? `${formValue.startTime}:00` : '',
        endTime: formValue.endTime ? `${formValue.endTime}:00` : '',
        breakDuration: formValue.breakDuration,
        daysofWeek: formValue.daysofWeek,
        timezone: formValue.timezone,
        marginHours: formValue.marginHours ?? 0,
        applyMarginhours: formValue.applyMarginhours,
        graceMinutes: formValue.graceMinutes ?? 0

      };

      this.attendanceService.updateShift(this.shiftId, updateDto).subscribe({
        next: () => {
          this.syncShiftGeoFence((formValue.geoFenceId || '').trim()).subscribe({
            next: () => {
              this.currentGeoFenceId = (formValue.geoFenceId || '').trim();
              this.isSubmitting = false;
              this.notification.showSuccess('Shift updated successfully');
              this.dialogRef.close('updated');
            },
            error: () => {
              this.isSubmitting = false;
              this.notification.showError('Shift updated, but failed to update the geo-fence');
            }
          });
        },
        error: (error) => {
          this.isSubmitting = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to update shift';
          this.notification.showError(errorMessage);
        }
      });

    } else {
      const request = {
        shiftName: formValue.shiftName,
        startTime: formValue.startTime + ':00',
        endTime: formValue.endTime + ':00',
        breakDuration: formValue.breakDuration,
        daysofWeek: formValue.daysofWeek,
        timezone: formValue.timezone,
        marginHours: formValue.marginHours ?? 0,
        applyMarginhours: formValue.applyMarginhours,
        graceMinutes: formValue.graceMinutes ?? 0

      };

      this.attendanceService.createShift(request).subscribe({
        next: async (response: any) => {
          const selectedFenceId = formValue.geoFenceId as string;
          const createdShiftId = await this.resolveShiftIdFromCreateResponse(response, formValue);

          if (selectedFenceId && createdShiftId) {
            this.geoFenceService.linkToShift(createdShiftId, selectedFenceId).subscribe({
              next: () => {
                this.isSubmitting = false;
                this.notification.showSuccess('Shift created successfully');
                this.shiftForm.reset();
                this.dialogRef.close('created');
              },
              error: () => {
                this.isSubmitting = false;
                this.notification.showError('Shift created but failed to link geo-fence');
                this.dialogRef.close('created');
              }
            });
            return;
          }

          this.isSubmitting = false;
          this.notification.showSuccess('Shift created successfully');
          this.shiftForm.reset();
          this.dialogRef.close('created');
        },
        error: (error) => {
          this.isSubmitting = false;
          const errorMessage = error?.error?.message || error?.message || 'Failed to create shift';
          this.notification.showError(errorMessage);
        }
      });
    }
  }

  private syncShiftGeoFence(selectedFenceId: string): Observable<void> {
    const nextFenceId = (selectedFenceId || '').trim();
    const previousFenceId = this.currentGeoFenceId.trim();

    if (previousFenceId === nextFenceId) {
      return of(void 0);
    }

    const unlink$ = previousFenceId
      ? this.geoFenceService.unlinkFromShift(this.shiftId, previousFenceId)
      : of(true);

    if (!nextFenceId) {
      return unlink$.pipe(switchMap(() => of(void 0)));
    }

    return unlink$.pipe(
      switchMap(() => this.geoFenceService.linkToShift(this.shiftId, nextFenceId)),
      switchMap(() => of(void 0))
    );
  }

toggleDay(value: number): void {
  const control = this.shiftForm.get('daysofWeek');
  if (!control) return;
  
  const current: number[] = control.value ?? [];
  const updated = current.includes(value)
    ? current.filter(d => d !== value)
    : [...current, value];
  
  control.setValue(updated);
  control.markAsTouched();
}
  
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
