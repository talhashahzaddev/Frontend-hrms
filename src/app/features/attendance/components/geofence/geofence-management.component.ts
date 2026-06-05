import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { Subject, takeUntil } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  GeoFenceService,
  GeoFenceDto,
  CreateGeoFenceDto
} from '../../services/geofence.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { AuthService } from '../../../../core/services/auth.service';

import { SharedCommonModule } from '@shared/shared-common.module';
declare const L: any; // Leaflet


@Component({
  selector: 'app-geo-fence-management',
  standalone: true,
  imports: [
    SharedCommonModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSelectModule
  ],
  templateUrl: './geofence-management.component.html',
  styleUrls: ['./geofence-management.component.scss']
})
export class GeoFenceManagementComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @ViewChild('drawerMapContainer') drawerMapContainer!: ElementRef;

  private destroy$ = new Subject<void>();
  private map: any;
  private drawerMap: any;
  private fenceCircles: Map<string, any> = new Map();
  private drawerCircle: any;

  fences: GeoFenceDto[] = [];
  filteredFences: GeoFenceDto[] = [];
  selectedFence: GeoFenceDto | null = null;
  isLoading = false;
  isDrawerOpen = false;
  isEditMode = false;
  isSubmitting = false;
  isSavingToggle: string | null = null;
  searchQuery = '';

  fenceForm: FormGroup;

  // Nominatim geocoding state
  addressSuggestions: any[] = [];
  isSearchingAddress = false;
  addressSearchControl = new Subject<string>();

  private readonly TEAL = '#0D9488';
  private readonly PURPLE = '#7C3AED';

  constructor(
    private geoFenceService: GeoFenceService,
    private notification: NotificationService,
    private fb: FormBuilder,
    private ngZone: NgZone,
    private authService: AuthService
  ) {
    this.fenceForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      address: [''],
      centerLatitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      centerLongitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
      radiusMeters: [200, [Validators.required, Validators.min(50), Validators.max(50000)]],
      shape: ['circle'],
      isActive: [true]
    });
  }

  hasPermission(actionKey: string): boolean {
    return this.authService.hasMenuPermission('Attendance', 'Geo-Fences', actionKey);
  }

  ngOnInit(): void {
    this.loadFences();
    this.setupAddressSearch();

    // Watch radius changes to update drawer map
    this.fenceForm.get('radiusMeters')?.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(() => this.updateDrawerCircle());
  }

  ngAfterViewInit(): void {
    this.initMainMap();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) this.map.remove();
    if (this.drawerMap) this.drawerMap.remove();
  }

  // ── Map Init ────────────────────────────────────────────────────────

  private initMainMap(): void {
    if (!this.mapContainer?.nativeElement) return;
    if (typeof L === 'undefined') {
      setTimeout(() => this.initMainMap(), 200);
      return;
    }

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [31.5204, 74.3587], // Lahore default
      zoom: 13,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Click on map to pick location in drawer
    this.map.on('click', (e: any) => {
      this.ngZone.run(() => {
        if (this.isDrawerOpen) {
          this.fenceForm.patchValue({
            centerLatitude: parseFloat(e.latlng.lat.toFixed(6)),
            centerLongitude: parseFloat(e.latlng.lng.toFixed(6))
          });
          this.updateDrawerCircle();
        }
      });
    });
  }

  private initDrawerMap(): void {
    setTimeout(() => {
      if (!this.drawerMapContainer?.nativeElement) return;
      if (typeof L === 'undefined') return;
      if (this.drawerMap) {
        this.drawerMap.remove();
        this.drawerMap = null;
      }

      const lat = this.fenceForm.value.centerLatitude || 31.5204;
      const lng = this.fenceForm.value.centerLongitude || 74.3587;

      this.drawerMap = L.map(this.drawerMapContainer.nativeElement, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: true,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(this.drawerMap);

      this.drawerMap.on('click', (e: any) => {
        this.ngZone.run(() => {
          this.fenceForm.patchValue({
            centerLatitude: parseFloat(e.latlng.lat.toFixed(6)),
            centerLongitude: parseFloat(e.latlng.lng.toFixed(6))
          });
          this.updateDrawerCircle();
        });
      });

      this.updateDrawerCircle();
    }, 100);
  }

  private updateDrawerCircle(): void {
    if (!this.drawerMap) return;
    const lat = this.fenceForm.value.centerLatitude;
    const lng = this.fenceForm.value.centerLongitude;
    const radius = this.fenceForm.value.radiusMeters || 200;

    if (!lat || !lng) return;

    if (this.drawerCircle) {
      this.drawerMap.removeLayer(this.drawerCircle);
    }

    this.drawerCircle = L.circle([lat, lng], {
      radius,
      color: this.TEAL,
      fillColor: this.TEAL,
      fillOpacity: 0.25,
      weight: 2
    }).addTo(this.drawerMap);

    this.drawerMap.setView([lat, lng], this.calcZoom(radius));
  }

  private calcZoom(radiusMeters: number): number {
    if (radiusMeters < 100) return 18;
    if (radiusMeters < 300) return 16;
    if (radiusMeters < 1000) return 15;
    if (radiusMeters < 5000) return 13;
    return 11;
  }

  // ── Load & Render Fences ─────────────────────────────────────────────

  loadFences(): void {
    this.isLoading = true;
    this.geoFenceService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fences) => {
          this.fences = fences;
          this.applySearch();
          this.renderFencesOnMap();
          this.isLoading = false;
        },
        error: (err) => {
          this.notification.showError('Failed to load geo-fences');
          this.isLoading = false;
        }
      });
  }

  private renderFencesOnMap(): void {
    if (!this.map) return;

    // Clear old layers
    this.fenceCircles.forEach(circle => this.map.removeLayer(circle));
    this.fenceCircles.clear();

    this.fences.forEach(fence => {
      if (!fence.centerLatitude || !fence.centerLongitude || !fence.isActive) return;

      const isSelected = this.selectedFence?.geoFenceId === fence.geoFenceId;
      const circle = L.circle(
        [fence.centerLatitude, fence.centerLongitude],
        {
          radius: fence.radiusMeters || 200,
          color: isSelected ? this.PURPLE : this.TEAL,
          fillColor: isSelected ? this.PURPLE : this.TEAL,
          fillOpacity: 0.2,
          weight: isSelected ? 3 : 2
        }
      ).addTo(this.map);

      circle.bindPopup(`<b>${fence.name}</b><br>${fence.address || ''}<br>Radius: ${fence.radiusMeters}m`);

      circle.on('click', () => {
        this.ngZone.run(() => this.selectFence(fence));
      });

      this.fenceCircles.set(fence.geoFenceId, circle);
    });

    // Fit map to bounds if fences exist
    if (this.fences.length > 0 && this.fences[0].centerLatitude) {
      const bounds = this.fences
        .filter(f => f.centerLatitude && f.centerLongitude)
        .map(f => [f.centerLatitude!, f.centerLongitude!]);
      if (bounds.length > 0) {
        this.map.fitBounds(bounds as any, { padding: [40, 40] });
      }
    }
  }

  // ── Search & Filter ──────────────────────────────────────────────────

  applySearch(): void {
    const q = this.searchQuery.toLowerCase().trim();
    this.filteredFences = q
      ? this.fences.filter(f =>
          f.name.toLowerCase().includes(q) ||
          (f.address || '').toLowerCase().includes(q)
        )
      : [...this.fences];
  }

  // ── Selection 
  selectFence(fence: GeoFenceDto): void {
    this.selectedFence = fence;
    this.renderFencesOnMap(); // re-render to highlight
    if (fence.centerLatitude && fence.centerLongitude) {
      this.map?.setView([fence.centerLatitude, fence.centerLongitude], 16);
    }
  }

  // ── Drawer 
  openCreate(): void {
    this.isEditMode = false;
    this.selectedFence = null;
    this.fenceForm.reset({
      name: '',
      description: '',
      address: '',
      centerLatitude: null,
      centerLongitude: null,
      radiusMeters: 200,
      shape: 'circle',
      isActive: true
    });
    this.addressSuggestions = [];
    this.isDrawerOpen = true;
    this.initDrawerMap();
  }

  openEdit(fence: GeoFenceDto, event: Event): void {
    event.stopPropagation();
    this.isEditMode = true;
    this.selectedFence = fence;
    this.fenceForm.patchValue({
      name: fence.name,
      description: fence.description || '',
      address: fence.address || '',
      centerLatitude: fence.centerLatitude,
      centerLongitude: fence.centerLongitude,
      radiusMeters: fence.radiusMeters || 200,
      shape: fence.shape,
      isActive: fence.isActive
    });
    this.addressSuggestions = [];
    this.isDrawerOpen = true;
    this.initDrawerMap();
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
    this.addressSuggestions = [];
    if (this.drawerMap) {
      this.drawerMap.remove();
      this.drawerMap = null;
      this.drawerCircle = null;
    }
  }

  // ── Address Search (Nominatim, free, no API key)
  private setupAddressSearch(): void {
    this.addressSearchControl
      .pipe(debounceTime(500), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(query => {
        if (query.length < 3) {
          this.addressSuggestions = [];
          return;
        }
        this.isSearchingAddress = true;
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`)
          .then(r => r.json())
          .then(results => {
            this.ngZone.run(() => {
              this.addressSuggestions = results;
              this.isSearchingAddress = false;
            });
          })
          .catch(() => {
            this.ngZone.run(() => { this.isSearchingAddress = false; });
          });
      });
  }

  onAddressInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.fenceForm.patchValue({ address: value });
    this.addressSearchControl.next(value);
  }

  pickSuggestion(suggestion: any): void {
    this.fenceForm.patchValue({
      address: suggestion.display_name,
      centerLatitude: parseFloat(parseFloat(suggestion.lat).toFixed(6)),
      centerLongitude: parseFloat(parseFloat(suggestion.lon).toFixed(6))
    });
    this.addressSuggestions = [];
    this.updateDrawerCircle();
  }

  // ── CRUD 
  saveFence(): void {
    if (this.fenceForm.invalid) {
      this.fenceForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formVal = this.fenceForm.value;

    if (this.isEditMode && this.selectedFence) {
      this.geoFenceService.update(this.selectedFence.geoFenceId, formVal).subscribe({
        next: () => {
          this.notification.showSuccess('Geo-fence updated successfully');
          this.closeDrawer();
          this.loadFences();
          this.isSubmitting = false;
        },
        error: () => {
          this.notification.showError('Failed to update geo-fence');
          this.isSubmitting = false;
        }
      });
    } else {
      const dto: CreateGeoFenceDto = {
        name: formVal.name,
        description: formVal.description,
        address: formVal.address,
        centerLatitude: formVal.centerLatitude,
        centerLongitude: formVal.centerLongitude,
        radiusMeters: formVal.radiusMeters,
        shape: formVal.shape
      };
      this.geoFenceService.create(dto).subscribe({
        next: () => {
          this.notification.showSuccess('Geo-fence created successfully');
          this.closeDrawer();
          this.loadFences();
          this.isSubmitting = false;
        },
        error: () => {
          this.notification.showError('Failed to create geo-fence');
          this.isSubmitting = false;
        }
      });
    }
  }

  deleteFence(fence: GeoFenceDto, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Delete "${fence.name}"? This cannot be undone.`)) return;

    this.geoFenceService.delete(fence.geoFenceId).subscribe({
      next: () => {
        this.notification.showSuccess('Geo-fence deleted');
        if (this.selectedFence?.geoFenceId === fence.geoFenceId) {
          this.selectedFence = null;
        }
        this.loadFences();
      },
      error: () => this.notification.showError('Failed to delete geo-fence')
    });
  }

  toggleActive(fence: GeoFenceDto, event: Event): void {
    event.stopPropagation();
    this.isSavingToggle = fence.geoFenceId;
    this.geoFenceService.toggleActive(fence.geoFenceId, !fence.isActive).subscribe({
      next: () => {
        fence.isActive = !fence.isActive;
        this.isSavingToggle = null;
        this.renderFencesOnMap();
      },
      error: () => {
        this.notification.showError('Failed to toggle geo-fence');
        this.isSavingToggle = null;
      }
    });
  }

  get radiusDisplay(): string {
    const r = this.fenceForm.value.radiusMeters;
    return r >= 1000 ? `${(r / 1000).toFixed(1)}km` : `${r}m`;
  }

  // Center map on selected fence
  flyToFence(fence: GeoFenceDto): void {
    if (fence.centerLatitude && fence.centerLongitude && this.map) {
      this.map.flyTo([fence.centerLatitude, fence.centerLongitude], 16, { duration: 0.8 });
    }
  }
}
