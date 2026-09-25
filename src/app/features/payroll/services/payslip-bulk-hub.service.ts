import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

export interface PayslipBulkProgress {
  jobId: string;
  total: number;
  processed: number;
  failed: number;
  percentageCompleted: number;
  isComplete: boolean;
  currentEmployeeId?: string | null;
  lastError?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PayslipBulkHubService {
  private readonly authService = inject(AuthService);
  private connection: signalR.HubConnection | null = null;
  private readonly progressSubject = new Subject<PayslipBulkProgress>();

  readonly progress$ = this.progressSubject.asObservable();

  get connectionId(): string | undefined {
    return this.connection?.connectionId ?? undefined;
  }

  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  private get hubUrl(): string {
    const base = environment.apiUrl.replace(/\/api\/?$/i, '');
    return `${base}/hubs/payslip-bulk`;
  }

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    if (this.connection) {
      await this.disconnect();
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => this.authService.getToken() ?? '',
        // JWT is sent via access_token query/header — avoid cookie credentials (breaks CORS with wildcard)
        withCredentials: false
      })
      .withAutomaticReconnect()
      .build();

    this.connection.on('PayslipBulkProgress', (payload: PayslipBulkProgress) => {
      this.progressSubject.next(payload);
    });

    await this.connection.start();
  }

  async joinJob(jobId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR is not connected.');
    }

    await this.connection.invoke('JoinJob', jobId);
  }

  async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      await this.connection.stop();
    } finally {
      this.connection = null;
    }
  }
}
