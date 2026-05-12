// ============================================================
// FILE: features/settings/components/policy-dialog/policy-dialog.component.ts
//
// CHANGES vs previous version:
//   1. selectedFileName: string | null — tracks original file name separately
//      (mirrors how Profile stores selectedProfileFile.name for display).
//   2. onFileSelected() — stores file.name in selectedFileName after upload.
//   3. removeSelectedFile() — resets selectedFileName to existingFileName.
//   4. removeExistingFile() — also clears selectedFileName.
//   5. ngOnInit() — pre-fills selectedFileName from policy.fileName on edit/view.
//   6. onSubmit() — passes fileName in payload so service appends it to FormData.
//
//   ALL other logic (form, toggles, validators, categories, quill) is UNCHANGED.
// ============================================================
import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule }          from '@angular/material/button';
import { MatIconModule }            from '@angular/material/icon';
import { MatFormFieldModule }       from '@angular/material/form-field';
import { MatInputModule }           from '@angular/material/input';
import { MatSelectModule }          from '@angular/material/select';
import { MatSlideToggleModule }     from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule }         from '@angular/material/divider';
import { MatChipsModule }           from '@angular/material/chips';
import { MatTooltipModule }         from '@angular/material/tooltip';
import { QuillModule }              from 'ngx-quill';

import {
  SettingsService,
  CompanyPolicy,
  CreatePolicyRequest,
  UpdatePolicyRequest,
  PolicyFieldToggles
} from '../../services/settings.service';
import { NotificationService } from '@core/services/notification.service';

export interface PolicyDialogData {
  mode:   'add' | 'edit' | 'view';
  policy: CompanyPolicy | null;
}

@Component({
  selector:    'app-policy-dialog',
  standalone:  true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSlideToggleModule, MatProgressSpinnerModule,
    MatDividerModule, MatChipsModule, MatTooltipModule,
    QuillModule
  ],
  templateUrl: './policy-dialog.component.html',
  styleUrls:   ['./policy-dialog.component.scss']
})
export class PolicyDialogComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  isSaving = false;

  // ── Field toggle state (UNCHANGED) ───────────────────────────────────────
  toggles: PolicyFieldToggles = {
    nameRequired:       false,
    categoryRequired:   false,
    contentRequired:    false,
    attachmentRequired: false
  };

  // ── File attachment state — mirrors Profile component ─────────────────────
  //   Profile:  selectedProfileFile,  isUploadingProfileImage, profileurl (form value)
  //   Policy:   selectedFile,         isUploadingFile,         uploadedFileUrl
  //             + selectedFileName    — original name for display & DB persistence
  selectedFile:     File   | null = null;   // for displaying filename/size in UI
  selectedFileName: string | null = null;   // ← NEW: original file name (persisted to DB)
  uploadedFileUrl:  string | null = null;   // URL returned by server — what gets saved
  isUploadingFile:  boolean       = false;  // mirrors isUploadingProfileImage
  fileError:        string | null = null;

  // Existing attachment on a saved policy (edit / view modes)
  existingFileUrl:  string | null = null;
  existingFileName: string | null = null;

  // ── Quill config (UNCHANGED) ──────────────────────────────────────────────
  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ header: 1 }, { header: 2 }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link']
    ]
  };

  readonly categories = [
    'Core Compliance', 'Benefits', 'Operations',
    'Finance', 'HR', 'Legal', 'Other'
  ];

  private destroy$ = new Subject<void>();

  // ── Getters (UNCHANGED) ───────────────────────────────────────────────────
  get mode()        { return this.data.mode; }
  get policy()      { return this.data.policy; }
  get isView()      { return this.mode === 'view'; }
  get dialogTitle() {
    return this.mode === 'add'  ? 'New Policy'
         : this.mode === 'edit' ? 'Edit Policy'
                                : 'View Policy';
  }

  constructor(
    private fb:                  FormBuilder,
    private settingsService:     SettingsService,
    private notificationService: NotificationService,
    public  dialogRef:           MatDialogRef<PolicyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PolicyDialogData
  ) {}

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.buildForm();

    if (this.policy) {
      this.form.patchValue({
        policyName:    this.policy.policyName,
        category:      this.policy.category,
        policyContent: this.policy.policyContent,
        isPublished:   this.policy.isPublished
      });

      if (this.policy.fieldToggles) {
        try { this.toggles = JSON.parse(this.policy.fieldToggles); } catch { /* keep defaults */ }
      }

      // Restore saved attachment.
      // uploadedFileUrl pre-filled so re-saving without changing file keeps existing URL.
      // selectedFileName pre-filled from policy.fileName for display in view/edit modes.
      this.existingFileUrl  = this.policy.fileUrl  ?? null;
      this.existingFileName = this.policy.fileName ?? null;
      this.uploadedFileUrl  = this.policy.fileUrl  ?? null;
      this.selectedFileName = this.policy.fileName ?? null; // ← NEW: pre-fill for display
    }

    if (this.isView) { this.form.disable(); }

    this.applyToggleValidators();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      policyName:    [''],
      category:      [''],
      policyContent: [''],
      isPublished:   [false]
    });
  }

  // ── Toggle handling (UNCHANGED) ───────────────────────────────────────────

  onToggleChange(field: keyof PolicyFieldToggles, checked: boolean): void {
    this.toggles[field] = checked;
    this.applyToggleValidators();
  }

  private applyToggleValidators(): void {
    this.setValidator('policyName',    this.toggles.nameRequired);
    this.setValidator('category',      this.toggles.categoryRequired);
    this.setValidator('policyContent', this.toggles.contentRequired);
  }

  private setValidator(controlName: string, required: boolean): void {
    const ctrl = this.form.get(controlName);
    if (!ctrl) return;
    if (required) {
      ctrl.setValidators([Validators.required, Validators.minLength(1)]);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  // ── File handling ─────────────────────────────────────────────────────────

  /**
   * Called when the admin picks a file.
   *
   * NEW vs previous: after successful upload, selectedFileName is set to
   * file.name so the template can display it and onSubmit() can send it
   * to the backend as 'fileName' field.
   */
  onFileSelected(event: Event): void {
    this.fileError       = null;
    const input          = event.target as HTMLInputElement;
    const file           = input.files?.[0] ?? null;
    input.value          = '';                // allow re-selecting same file

    if (!file) { this.selectedFile = null; return; }

    // Store for UI display (filename, size chip)
    this.selectedFile    = file;
    this.isUploadingFile = true;

    // Upload immediately — mirrors authService.uploadProfilePic(file)
    this.settingsService.uploadFile(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (url: string) => {
          this.uploadedFileUrl  = url;
          this.selectedFileName = file.name;   // ← NEW: store name after successful upload
          this.isUploadingFile  = false;
          this.notificationService.showSuccess('File uploaded successfully');
        },
        error: (err: any) => {
          this.isUploadingFile  = false;
          this.uploadedFileUrl  = this.existingFileUrl;
          this.selectedFileName = this.existingFileName; // ← NEW: revert to existing on error
          this.selectedFile     = null;
          this.fileError        = err?.message || 'File upload failed';
          this.notificationService.showError(this.fileError ?? 'File upload failed');
        }
      });
  }

  /**
   * Remove newly selected file.
   * Reverts selectedFileName to existing name so UI stays consistent.
   */
  removeSelectedFile(): void {
    this.selectedFile    = null;
    this.uploadedFileUrl = this.existingFileUrl;
    this.selectedFileName = this.existingFileName; // ← NEW: revert name
    this.fileError       = null;
  }

  /** Remove the server-side attachment that came from the saved policy record (edit mode). */
  removeExistingFile(): void {
    this.existingFileUrl  = null;
    this.existingFileName = null;
    this.uploadedFileUrl  = null;
    this.selectedFileName = null; // ← NEW: clear name too
  }

  /**
   * Open file in a new browser tab without forcing a download.
   * Used in both edit and view modes (admin + employee).
   */
  openFile(url: string | null): void {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.toggles.attachmentRequired && !this.uploadedFileUrl) {
      this.fileError = 'An attachment is required (enabled by toggle).';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isUploadingFile) {
      this.notificationService.showError('Please wait for the file upload to complete.');
      return;
    }

    this.isSaving = true;
    const val     = this.form.value;

    // ── NEW: fileName resolved in priority order ───────────────────────────
    // 1. selectedFileName  — just-uploaded file name (set in onFileSelected)
    // 2. existingFileName  — previously saved name (for unchanged edit)
    // 3. null              — no file attached
    const resolvedFileName = this.selectedFileName ?? this.existingFileName ?? null;

    const payload: CreatePolicyRequest | UpdatePolicyRequest = {
      policyName:    (val.policyName    ?? '').trim(),
      category:      val.category       ?? '',
      policyContent: typeof val.policyContent === 'string'
                       ? val.policyContent.trim()
                       : JSON.stringify(val.policyContent ?? ''),
      isPublished:   !!val.isPublished,
      fieldToggles:  JSON.stringify(this.toggles),
      attachment:    null,                         // no raw file — already uploaded
      fileUrl:       this.uploadedFileUrl ?? '',   // pre-uploaded URL
      fileName:      resolvedFileName ?? ''        // ← NEW: original file name for DB
    } as any;

    const op$ = this.mode === 'add'
      ? this.settingsService.createPolicy(payload as CreatePolicyRequest)
      : this.settingsService.updatePolicy(this.policy!.policyId, payload as UpdatePolicyRequest);

    op$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSaving = false;
        this.notificationService.showSuccess(
          this.mode === 'add' ? 'Policy created successfully' : 'Policy updated successfully'
        );
        this.dialogRef.close('saved');
      },
      error: (err: any) => {
        this.isSaving = false;
        const msg = err?.error?.message || err?.message
          || (this.mode === 'add' ? 'Failed to create policy' : 'Failed to update policy');
        this.notificationService.showError(msg);
      }
    });
  }

  cancel(): void { this.dialogRef.close(); }
}