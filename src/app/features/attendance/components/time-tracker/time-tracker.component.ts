import { Component, OnInit, OnDestroy, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { CommentDialogComponent } from '../../../../shared/components/comment-dialog/comment-dialog.component';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { Subject, takeUntil, interval, filter, switchMap, take, firstValueFrom } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AttendanceService } from '../../services/attendance.service';
import { EmployeeService } from '../../../employee/services/employee.service';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import {
  TimeTrackingSession,
  Attendance,
  AttendanceSessionDto,
} from '../../../../core/models/attendance.models';
import { User } from '../../../../core/models/auth.models';
import { GeoFenceService, ShiftGeoFenceDto, GeoClockInRequest } from '../../services/geofence.service';
import { environment } from '../../../../../environments/environment';
declare const faceapi: any;
type StepState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-time-tracker',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    FormsModule,
    MatTableModule,
    MatNativeDateModule,
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: './time-tracker.component.html',
  styleUrls: ['./time-tracker.component.scss']
})
export class TimeTrackerComponent implements OnInit, OnDestroy {
  @ViewChild('videoEl') videoEl!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;
  private destroy$ = new Subject<void>();

  // ── existing state ────────────────────────────────────────────────────────
  currentUser: User | null = null;
  currentSession: TimeTrackingSession | null = null;
  todayAttendance: Attendance | null = null;
  recentAttendance: Attendance[] = []
  currentTime = new Date();
  filterStartDate: Date | null = null;
  filterEndDate: Date | null = null;
  todaySessions: AttendanceSessionDto[] = [];
  isLoadingSessions = false;
  isLoading = false;
  isClockActionLoading = false;
  canViewTeamAttendance = false;
  currentShiftId: string | null = null;
  // ── geo-fence state ───────────────────────────────────────────────────────
  shiftHasGeoFence = false;
  shiftGeoFences: ShiftGeoFenceDto[] = [];
  matchedGeoFenceId: string | null = null;
  matchedGeoFenceName: string | null = null;
  matchedDistanceMeters = 0;
  matchedAllowedRadiusMeters = 0;
  isShiftLoading = false;
  isGeoFenceLookupFailed = false;

  // ── step states ───────────────────────────────────────────────────────────
  gpsState: StepState = 'idle';
  gpsMessage = '';
  cameraState: StepState = 'idle';
  faceState: StepState = 'idle';
  faceMessage = '';
  faceConfidence = 0;
  faceDistance = 0;
  showCameraPanel = false;
  private faceModelsLoaded = false;
  private faceDetectorMode: 'ssd' | 'tiny' = 'ssd';
  private mediaStream: MediaStream | null = null;
  private capturedDescriptor: Float32Array | null = null;
  private storedDescriptor: Float32Array | null = null;
  private readonly faceMatchDistanceThreshold = 0.5;
  // Above 50% match required for clock in/out.
  private readonly faceMinConfidencePercent = 51;

  get geoFaceGateOpen(): boolean {
    return this.gpsState === 'success' && this.faceState === 'success';
  }

  constructor(
    private attendanceService: AttendanceService,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private notification: NotificationService,
    private dialog: MatDialog,
    public geoFenceService: GeoFenceService,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(
        filter(user => !!user),   // wait until user is actually populated
        take(1),                   // only fire once on init
        takeUntil(this.destroy$)
      )
      .subscribe(user => {
        this.currentUser = user;
        this.canViewTeamAttendance = this.checkTeamAttendancePermission(user);
        this.loadCurrentShift();  // now userId is guaranteed non-null
        this.preWarmFaceModels();   
      });

    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        this.canViewTeamAttendance = this.checkTeamAttendancePermission(user);
      });

    this.loadCurrentSession();
    this.loadTodayAttendance();
    this.loadRecentAttendance();
    this.loadTodaySessions();
    this.setupTimeUpdater();
  }
      private async preWarmFaceModels(): Promise<void> {
        try {
          if (typeof faceapi !== 'undefined' && !this.faceModelsLoaded) {
            await this.loadFaceModelsWithFallback();
            this.faceModelsLoaded = true;
          }
        } catch { /* silent — will retry when user clicks scan */ }
      }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopCamera();
  }

  // ── role helpers ──────────────────────────────────────────────────────────
  // get isAdminOrHR(): boolean { return this.authService.hasAnyRole(['Super Admin', 'HR Manager']); }
  hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Attendance', 'TimeTracker', actionKey);
  }

  
  loadCurrentShift(): void {
    const userId = this.currentUser?.userId;
    if (!userId) {
      this.currentShiftId = null;
      this.shiftHasGeoFence = false;
      this.isGeoFenceLookupFailed = false;
      return;
    }
    this.isShiftLoading = true;
    this.attendanceService
      .getCurrentShiftByEmployee(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (shiftId) => {
          this.currentShiftId = shiftId;
          this.isShiftLoading = false;
          if (shiftId) {
            this.checkShiftGeoFences(shiftId);
          } else {
            this.shiftHasGeoFence = false;
            this.shiftGeoFences = [];
            this.isGeoFenceLookupFailed = false;
          }
        },
        error: () => {
          this.currentShiftId = null;
          this.shiftHasGeoFence = false;
          this.isGeoFenceLookupFailed = false;
          this.isShiftLoading = false;
        }
      });
  }

  private checkShiftGeoFences(shiftId: string): void {
    this.geoFenceService.getByShift(shiftId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fences) => {
          this.shiftGeoFences = fences.filter(f => f.isActive);
          this.shiftHasGeoFence = this.shiftGeoFences.length > 0;
          this.isGeoFenceLookupFailed = false;

          this.enrichShiftFencesWithCoordinates();
        },
        error: () => {
          this.shiftHasGeoFence = false;
          this.shiftGeoFences = [];
          this.isGeoFenceLookupFailed = true;
        }
      });
  }

  private enrichShiftFencesWithCoordinates(): void {
    const missingCoordinates = this.shiftGeoFences.some(f =>
      this.toNumber((f as any).centerLatitude) === null || this.toNumber((f as any).centerLongitude) === null
    );

    if (!missingCoordinates) {
      return;
    }
    this.geoFenceService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (allFences) => {
          const byId = new Map(allFences.map(f => [f.geoFenceId, f]));
          this.shiftGeoFences = this.shiftGeoFences.map(link => {
            const full = byId.get(link.geoFenceId);
            if (!full) {
              return link;
            }
            return {
              ...link,
              geoFenceName: link.geoFenceName || full.name,
              radiusMeters: link.radiusMeters || full.radiusMeters,
              centerLatitude: this.toNumber((link as any).centerLatitude) ?? full.centerLatitude,
              centerLongitude: this.toNumber((link as any).centerLongitude) ?? full.centerLongitude
            } as ShiftGeoFenceDto;
          });
        },
        error: () => {
        }
      });
  }

  private checkTeamAttendancePermission(user: User | null): boolean {
    if (!user?.role) return false;
    return ['Super Admin', 'HR Manager', 'Manager'].includes(user.role);
  }

  private setupTimeUpdater(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentTime = new Date();
        if (this.currentSession?.isActive) this.updateElapsedTime();
      });
  }

  private updateElapsedTime(): void {
    if (this.currentSession?.checkInTime) {
      const diffMs = new Date().getTime() - new Date(this.currentSession.checkInTime).getTime();
      this.currentSession.elapsedHours = diffMs / (1000 * 60 * 60);
    }
  }

  private loadTodaySessions(): void {
    this.isLoadingSessions = true;
    this.attendanceService.getTodaySessions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sessions) => { this.todaySessions = sessions || []; this.isLoadingSessions = false; },
        error: (e) => { this.notification.showError(e?.error?.message || 'Failed to load today sessions'); this.isLoadingSessions = false; }
      });
  }

  private loadCurrentSession(): void {
    this.attendanceService.getCurrentSession()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (session) => { this.currentSession = session; },
        error: (e) => { this.notification.showError(e?.error?.message || 'Failed to load current session'); }
      });
  }

  private loadTodayAttendance(): void {
    const today = new Date().toISOString().split('T')[0];
    this.attendanceService.getMyAttendance(today, today)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (attendances) => {
          this.todayAttendance = attendances.length > 0 ? attendances[0] : null;
          // BUG FIX #4 (secondary): If shift wasn't loaded from CurrentShift API yet,
          
          if (this.todayAttendance?.shiftId && !this.currentShiftId) {
            this.currentShiftId = this.todayAttendance.shiftId;
            this.checkShiftGeoFences(this.currentShiftId);
          }
        },
        error: (e) => { this.notification.showError(e?.error?.message || 'Failed to load today attendance'); }
      });
  }

  private formatLocalDate(date: Date): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private loadRecentAttendance(): void {
    this.isLoading = true;
    const startDate = this.filterStartDate
      ? this.formatLocalDate(this.filterStartDate)
      : this.formatLocalDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const endDate = this.filterEndDate
      ? this.formatLocalDate(this.filterEndDate)
      : this.formatLocalDate(new Date());

    this.attendanceService.getMyAttendance(startDate, endDate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (a) => { this.recentAttendance = a.slice(0, 5); this.isLoading = false; },
        error: (e) => { this.notification.showError(e?.error?.message || 'Failed to load recent attendance'); this.isLoading = false; }
      });
  }

  applyDateFilter(): void { this.loadRecentAttendance(); }

  formatSessionDuration(checkIn: string | Date, checkOut?: string | Date): string {
    const start = new Date(checkIn).getTime();
    const end = checkOut ? new Date(checkOut).getTime() : new Date().getTime();
    const diffMs = end - start;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  formatElapsedTime(hours: number): string {
    const totalMinutes = Math.floor(hours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs}h ${mins}m`;
  }

  formatHours(hours: number): string {
    if (hours === 0) return '0h 0m';
    const hrs = Math.floor(hours);
    const mins = Math.round((hours - hrs) * 60);
    return `${hrs}h ${mins}m`;
  }

  clockIn(): void {
    if (this.isShiftLoading) {
      this.notification.showError('Loading shift information, please wait a moment...');
      return;
    }
    if (!this.currentShiftId) {
      this.notification.showError('No shift assigned for today. Please contact HR.');
      return;
    }
    if (this.isGeoFenceLookupFailed) {
      this.notification.showError('Unable to verify geo-fence for your shift. Please contact admin.');
      return;
    }
    if (this.shiftHasGeoFence) {
      this.resetGeoFaceState();
      this.showCameraPanel = true;
      this.startGpsVerification('in');
    } else {
      this.doStandardClockIn();
    }
  }

  clockOut(): void {
    if (this.isShiftLoading) {
      this.notification.showError('Loading shift information, please wait a moment...');
      return;
    }
    if (!this.currentShiftId) {
      this.notification.showError('No shift assigned for today. Please contact HR.');
      return;
    }
    if (this.isGeoFenceLookupFailed) {
      this.notification.showError('Unable to verify geo-fence for your shift. Please contact admin.');
      return;
    }
    if (this.shiftHasGeoFence) {
      this.resetGeoFaceState();
      this.showCameraPanel = true;
      this.startGpsVerification('out');
    } else {
      this.doStandardClockOut();
    }
  }
  // ── Standard (non-geo) clock methods ─────────────────────────────────────
  private doStandardClockIn(): void {
    void this.clockViaGeoEndpoint('in');
  }
  private doStandardClockOut(): void {
    const dialogRef = this.dialog.open(CommentDialogComponent, {
      width: '400px',
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
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => resolve({}),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
      );
    });
  }

  private clockViaGeoEndpoint(action: 'in' | 'out', notes?: string): void {
    this.isClockActionLoading = true;

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
            this.refreshAfterClock();
            this.isClockActionLoading = false;
          },
          error: (e) => {
            this.notification.showError(e?.error?.message || `Failed to clock ${action === 'in' ? 'in' : 'out'}.`);
            this.isClockActionLoading = false;
          }
        });
    });
  }

  // ── Geo + Face gate flow ─────────────────────────────────────────────────
  pendingClockAction: 'in' | 'out' = 'in';

  private resetGeoFaceState(): void {
    this.gpsState = 'idle';
    this.gpsMessage = '';
    this.cameraState = 'idle';
    this.faceState = 'idle';
    this.faceMessage = '';
    this.faceConfidence = 0;
    this.faceDistance = 0;
    this.capturedDescriptor = null;
    this.matchedGeoFenceId = null;
    this.matchedGeoFenceName = null;
    this.matchedDistanceMeters = 0;
    this.matchedAllowedRadiusMeters = 0;
    this.stopCamera();
  }

  cancelGeoFlow(): void {
    this.showCameraPanel = false;
    this.resetGeoFaceState();
  }

  // Step 1: GPS
  private startGpsVerification(action: 'in' | 'out'): void {
    this.pendingClockAction = action;
    this.gpsState = 'loading';
    this.gpsMessage = 'Requesting location…';

    if (!navigator.geolocation) {
      this.gpsState = 'error';
      this.gpsMessage = 'Geolocation not supported by this browser.';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => this.ngZone.run(() => this.onGpsSuccess(pos)),
      (err) => this.ngZone.run(() => this.onGpsError(err)),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  private onGpsError(err: GeolocationPositionError): void {
    this.gpsState = 'error';
    this.gpsMessage = err.code === 1
      ? 'Location permission denied. Please allow location access and retry.'
      : 'Could not determine your location. Please try again.';
  }

  private onGpsSuccess(pos: GeolocationPosition): void {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    const locationValidation = this.validateLocationForShift(lat, lng);
    if (!locationValidation.allowed) {
      this.gpsState = 'error';
      this.gpsMessage = locationValidation.message;
      return;
    }

    this.matchedGeoFenceId = locationValidation.fenceId;
    this.matchedGeoFenceName = locationValidation.fenceName;
    this.matchedDistanceMeters = locationValidation.distanceMeters;
    this.matchedAllowedRadiusMeters = locationValidation.allowedRadiusMeters;

    this.gpsState = 'success';
    this.gpsMessage = locationValidation.message;
    this.openCamera(lat, lng);
  }

  private validateLocationForShift(lat: number, lng: number): {
    allowed: boolean;
    fenceId: string | null;
    fenceName: string | null;
    distanceMeters: number;
    allowedRadiusMeters: number;
    message: string;
  } {
    if (!this.shiftGeoFences.length) {
      return {
        allowed: false,
        fenceId: null,
        fenceName: null,
        distanceMeters: 0,
        allowedRadiusMeters: 0,
        message: 'No active geo-fence is linked to your shift. Please contact HR.'
      };
    }

    const evaluableFences = this.shiftGeoFences
      .map(f => {
        const centerLatitude = this.toNumber((f as any).centerLatitude);
        const centerLongitude = this.toNumber((f as any).centerLongitude);
        const radiusMeters = this.toNumber(f.radiusMeters) ?? 0;
        if (centerLatitude === null || centerLongitude === null || radiusMeters <= 0) {
          return null;
        }

        const distanceMeters = this.haversineDistanceMeters(lat, lng, centerLatitude, centerLongitude);
        return {
          id: f.geoFenceId,
          name: f.geoFenceName || 'Assigned Geo-Fence',
          distanceMeters,
          radiusMeters
        };
      })
      .filter((f): f is { id: string; name: string; distanceMeters: number; radiusMeters: number } => !!f)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    if (!evaluableFences.length) {
      return {
        allowed: false,
        fenceId: null,
        fenceName: null,
        distanceMeters: 0,
        allowedRadiusMeters: 0,
        message: 'Your assigned geo-fence is missing coordinates or radius. Please contact HR.'
      };
    }

    const insideFence = evaluableFences.find(f => f.distanceMeters <= f.radiusMeters);
    if (insideFence) {
      return {
        allowed: true,
        fenceId: insideFence.id,
        fenceName: insideFence.name,
        distanceMeters: insideFence.distanceMeters,
        allowedRadiusMeters: insideFence.radiusMeters,
        message: `Inside ${insideFence.name} (${Math.round(insideFence.distanceMeters)}m from center, allowed ${Math.round(insideFence.radiusMeters)}m).`
      };
    }

    const nearest = evaluableFences[0];
    const excess = Math.max(0, nearest.distanceMeters - nearest.radiusMeters);
    return {
      allowed: false,
      fenceId: nearest.id,
      fenceName: nearest.name,
      distanceMeters: nearest.distanceMeters,
      allowedRadiusMeters: nearest.radiusMeters,
      message: `You are outside ${nearest.name}. Move ${Math.round(excess)}m closer (distance ${Math.round(nearest.distanceMeters)}m, allowed ${Math.round(nearest.radiusMeters)}m).`
    };
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const earthRadius = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Step 2: Camera
  private clockLat = 0;
  private clockLng = 0;

  private openCamera(lat: number, lng: number): void {
  this.clockLat = lat;
  this.clockLng = lng;
  this.cameraState = 'loading';

  navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 640 },    // ← better resolution for accuracy
      height: { ideal: 480 }
    }
  })
    .then(stream => this.ngZone.run(() => this.onCameraReady(stream)))
    .catch(() => this.ngZone.run(() => {
      this.cameraState = 'error';
      this.faceMessage = 'Camera permission denied. Please allow camera access and retry.';
    }));
}

  private onCameraReady(stream: MediaStream): void {
    this.mediaStream = stream;
    this.cameraState = 'success';
    setTimeout(() => {
      if (this.videoEl?.nativeElement) {
        this.videoEl.nativeElement.srcObject = stream;
        this.videoEl.nativeElement.play().catch(() => {});
      }
      this.initializeFaceModels();
    }, 100);
  }

  private stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop());
      this.mediaStream = null;
    }
  }

  // Step 3: Face-api.js
  private async initializeFaceModels(): Promise<void> {
  this.faceState = 'loading';
  this.faceMessage = 'Loading face recognition models…';

  try {
    if (typeof faceapi === 'undefined') {
      throw new Error('face-api.js not loaded. Add CDN script to index.html.');
    }
    if (!this.faceModelsLoaded) {
      await this.loadFaceModelsWithFallback();
      this.faceModelsLoaded = true;
    }
    // FIX: Do NOT auto-scan. Just tell user models are ready.
    this.ngZone.run(() => {
      this.faceState = 'idle';
      this.faceMessage = 'Camera ready. Position your face in the frame, then click "Scan Face".';
    });
  } catch (e: any) {
    this.ngZone.run(() => {
      this.faceState = 'error';
      this.faceMessage = e?.message || 'Failed to load face recognition models.';
    });
  }
}
  private async loadFaceModelsWithFallback(): Promise<void> {
    try {
      const localModelUrl = '/assets/face-api-models';
      await faceapi.nets.ssdMobilenetv1.loadFromUri(localModelUrl);
      await faceapi.nets.faceLandmark68Net.loadFromUri(localModelUrl);
      await faceapi.nets.faceRecognitionNet.loadFromUri(localModelUrl);
      this.faceDetectorMode = 'ssd';
    } catch {
      const remoteModelUrl = 'https://justadudewhohacks.github.io/face-api.js/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(remoteModelUrl);
      await faceapi.nets.faceLandmark68Net.loadFromUri(remoteModelUrl);
      await faceapi.nets.faceRecognitionNet.loadFromUri(remoteModelUrl);
      this.faceDetectorMode = 'tiny';
    }
  }

  async startFaceScan(): Promise<void> {
  if (this.cameraState !== 'success') return;

  const profileUrl = await this.resolveProfilePictureUrl();

  // FIX #1: Block scan if no profile picture exists
  if (!profileUrl) {
    this.ngZone.run(() => {
      this.faceState = 'error';
      this.faceMessage = 'Profile picture not uploaded. Please upload your profile photo in your profile settings before clocking in.';
    });
    return;
  }

  if (!this.faceModelsLoaded) {
    await this.initializeFaceModels();
    if (!this.faceModelsLoaded) return;
  }

  this.faceState = 'loading';
  this.faceMessage = 'Scanning… Please look directly at the camera and stay still.';
  this.capturedDescriptor = null;
  
  // Give camera 1.5 seconds to auto-focus and adjust white-balance to prevent blurred captures
  await new Promise(r => setTimeout(r, 1500));
  
  await this.runFaceDetection(profileUrl);
}

async retryFaceScan(): Promise<void> {
  await this.startFaceScan();
}
private async runFaceDetection(profileUrl: string): Promise<void> {
  const video = this.videoEl?.nativeElement;
  if (!video) {
    this.ngZone.run(() => { this.faceState = 'error'; this.faceMessage = 'Camera element not ready.'; });
    return;
  }
  try {
    // FIX: Detect ALL faces first to check for 0 or multiple
    const allDetections = this.faceDetectorMode === 'tiny'
      ? await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      : await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }));

    if (!allDetections || allDetections.length === 0) {
      this.ngZone.run(() => {
        this.faceState = 'error';
        this.faceMessage = 'No face detected. Please ensure: ① good lighting, ② face the camera directly, ③ remove glasses or hat if needed.';
      });
      return;
    }

    if (allDetections.length > 1) {
      this.ngZone.run(() => {
        this.faceState = 'error';
        this.faceMessage = `${allDetections.length} faces detected in the frame. Only one person should be visible. Please ensure you are alone in front of the camera.`;
      });
      return;
    }

    // Exactly 1 face — now get full descriptor
    const detection = await this.detectFaceWithDescriptor(video);
    if (!detection) {
      this.ngZone.run(() => {
        this.faceState = 'error';
        this.faceMessage = 'Face detected but could not extract features. Adjust lighting and try again.';
      });
      return;
    }

    this.capturedDescriptor = detection.descriptor;
    await this.compareFaceWithStored(profileUrl);
  } catch (e: any) {
    this.ngZone.run(() => {
      this.faceState = 'error';
      this.faceMessage = e?.message || 'Face detection failed. Please try again.';
    });
  }
}
private async compareFaceWithStored(profileUrl: string): Promise<void> {  
  try {
    this.ngZone.run(() => { this.faceMessage = 'Comparing with your profile photo…'; });

    const img = await this.loadImageForFaceComparison(profileUrl);

    // Check for faces in profile photo too
    const allRefDetections = this.faceDetectorMode === 'tiny'
      ? await faceapi.detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      : await faceapi.detectAllFaces(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }));

    if (!allRefDetections || allRefDetections.length === 0) {
      this.ngZone.run(() => {
        this.faceState = 'error';
        this.faceMessage = 'No face found in your profile photo. Please update your profile picture to a clear front-facing photo.';
        this.faceConfidence = 0;
      });
      return;
    }

    const refDetection = await this.detectFaceWithDescriptor(img);
    if (!refDetection) {
      this.ngZone.run(() => {
        this.faceState = 'error';
        this.faceMessage = 'Could not read your profile photo for comparison. Please update your profile picture.';
        this.faceConfidence = 0;
      });
      return;
    }

    const distance = faceapi.euclideanDistance(this.capturedDescriptor!, refDetection.descriptor);
    const confidence = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));
    this.storedDescriptor = refDetection.descriptor;

    this.ngZone.run(() => {
      this.faceDistance = distance;
      this.faceConfidence = confidence;
      if (distance <= this.faceMatchDistanceThreshold && confidence >= this.faceMinConfidencePercent) {
        this.faceState = 'success';
        this.faceMessage = `Identity verified ✓ (${confidence}% match)`;
      } else {
        this.faceState = 'error';
        this.faceMessage = `Face match too weak (${confidence}% match). Please retry in better lighting and keep your face centered.`;
      }
    });
  } catch (e: any) {
    this.ngZone.run(() => {
      this.faceState = 'error';
      this.faceMessage = 'Error comparing face. Check your internet connection and try again.';
    });
  }
}

  private async resolveProfilePictureUrl(): Promise<string | null> {
    const fromCurrentUser = this.extractProfilePictureUrl(this.currentUser as any);
    if (fromCurrentUser) {
      return fromCurrentUser;
    }

    try {
      if (!this.currentUser?.userId) {
         return null;
      }
      
      const me: any = await firstValueFrom(this.employeeService.getEmployee(this.currentUser.userId));
      this.currentUser = { ...(this.currentUser || {}), ...(me as any) } as User;
      return this.extractProfilePictureUrl(me);
    } catch {
      return null;
    }
  }

  private extractProfilePictureUrl(user: any): string | null {
    if (!user) {
      return null;
    }

    const candidate = [
      user.profilePictureUrl,
      user.ProfilePictureUrl,
      user.profileurl,
      user.profileUrl,
      user.photoUrl,
      user.PhotoUrl
    ].find((value: unknown) => typeof value === 'string' && value.trim().length > 0) as string | undefined;

    return candidate ? this.normalizeProfileImageUrl(candidate) : null;
  }

  private normalizeProfileImageUrl(rawUrl: string): string {
    const value = rawUrl.trim();
    if (/^https?:\/\//i.test(value) || /^data:/i.test(value) || /^blob:/i.test(value)) {
      return value;
    }

    const apiOrigin = new URL(environment.apiUrl, window.location.origin).origin;
    if (value.startsWith('//')) {
      return `${window.location.protocol}${value}`;
    }

    return `${apiOrigin}${value.startsWith('/') ? '' : '/'}${value}`;
  }
  private loadImageForFaceComparison(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Unable to read profile image for face comparison.'));
      img.src = url;
    });
  }

  private detectFaceWithDescriptor(source: HTMLVideoElement | HTMLImageElement): Promise<any> {
    if (this.faceDetectorMode === 'tiny') {
      return faceapi
        .detectSingleFace(source, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
    }

    return faceapi
      .detectSingleFace(source, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
  }

  // ── Confirmed Geo Clock In/Out ─────────────────────────────────────────────
confirmGeoClock(): void {
  if (!this.geoFaceGateOpen) return;

  if (this.faceConfidence < this.faceMinConfidencePercent || this.faceDistance > this.faceMatchDistanceThreshold) {
    this.faceState = 'error';
    this.faceMessage = 'Face verification must be above 50% to clock in/out. Please retry scan.';
    return;
  }

  if (!this.matchedGeoFenceId && !this.shiftGeoFences[0]?.geoFenceId) {
    this.notification.showError('Geo-fence validation missing. Please retry GPS verification.');
    return;
  }

  this.isClockActionLoading = true;

  const descriptorJson = this.capturedDescriptor
    ? JSON.stringify(Array.from(this.capturedDescriptor))
    : undefined;

  const request: GeoClockInRequest = {
    action: this.pendingClockAction,
    latitude: this.clockLat,
    longitude: this.clockLng,
    geoFenceId: this.matchedGeoFenceId || this.shiftGeoFences[0]?.geoFenceId,
    faceDescriptor: descriptorJson,
    confidenceScore: this.faceConfidence / 100,   // ← KEY FIX: 0-1 range for numeric(5,4)
    distanceScore: this.faceDistance,              // already 0-1 from euclidean distance
    matchResult: this.faceState === 'success' ? 'match' : 'no_match',
    deviceInfo: JSON.stringify({
      userAgent: navigator.userAgent.substring(0, 200),
      platform: navigator.platform,
      timestamp: new Date().toISOString()
    })
  };

  this.geoFenceService.geoClock(request)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res) => {
        this.notification.showSuccess(res.message || `Clocked ${this.pendingClockAction} successfully!`);
        this.showCameraPanel = false;
        this.resetGeoFaceState();
        this.refreshAfterClock();
        this.isClockActionLoading = false;
      },
      error: (e) => {
        this.notification.showError(this.extractGeoClockErrorMessage(e));
        this.isClockActionLoading = false;
      }
    });
}
  private extractGeoClockErrorMessage(error: any): string {
    const details = Array.isArray(error?.error?.errors)
      ? error.error.errors.join(' | ')
      : '';

    return (
      error?.error?.message ||
      details ||
      error?.message ||
      `Clock ${this.pendingClockAction} failed.`
    );
  }

  private refreshAfterClock(): void {
    this.loadCurrentSession();
    this.loadTodayAttendance();
    this.loadRecentAttendance();
    this.loadTodaySessions();
  }

  // ── confidence ring helper ────────────────────────────────────────────────
  get confidenceRingDashArray(): string {
    const circumference = 2 * Math.PI * 28;
    const filled = (this.faceConfidence / 100) * circumference;
    return `${filled} ${circumference}`;
  }

  get confidenceRingColor(): string {
    if (this.faceConfidence >= 75) return '#4caf50';
    if (this.faceConfidence >= 50) return '#ff9800';
    return '#f44336';
  }
}
