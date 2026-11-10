export type BackupStatus = 'running' | 'completed' | 'failed';
export type BackupTrigger = 'manual' | 'scheduled';

export interface DatabaseBackup {
  backupId: string;
  fileName: string;
  sizeBytes?: number | null;
  status: BackupStatus;
  triggerType: BackupTrigger;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
  /** False when the server no longer has the file (e.g. it was redeployed without a volume). */
  fileAvailable: boolean;
}

export interface BackupSettings {
  isEnabled: boolean;
  frequencyDays: number;
  /** "HH:mm" in timeZone */
  runAtTime: string;
  /** IANA id, e.g. "Asia/Karachi" */
  timeZone: string;
  retentionCount: number;
  nextRunAt?: string | null;
  updatedAt?: string | null;
}

export type UpdateBackupSettingsRequest = Omit<BackupSettings, 'nextRunAt' | 'updatedAt'>;
