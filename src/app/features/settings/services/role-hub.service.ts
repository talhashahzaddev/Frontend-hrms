import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

export interface RoleUpdatedPayload {
  RoleId: string;
  RoleName: string;
  OrganizationId: string;
  Message: string;
}

@Injectable({ providedIn: 'root' })
export class RoleHubService {

  private readonly authService = inject(AuthService);
  private connection: signalR.HubConnection | null = null;

  private readonly roleUpdatedSubject = new Subject<RoleUpdatedPayload>();
  readonly roleUpdated$ = this.roleUpdatedSubject.asObservable();

  // ===== Connection Status =====
  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  get connectionId(): string | undefined {
    return this.connection?.connectionId ?? undefined;
  }

  // ===== Hub URL (same pattern as your payslip) =====
  private get hubUrl(): string {
    const base = environment.apiUrl.replace(/\/api\/?$/i, '');
    const url = `${base}/hubs/permissionHub`;
    console.log('🔗 [RoleHubService] Hub URL:', url);
    return url;
  }

  // ===== Connect =====
  async connect(): Promise<void> {
    console.log('🚀 [RoleHubService] Attempting to connect...');

    if (this.connection?.state === signalR.HubConnectionState.Connected) {
      console.log('✅ [RoleHubService] Already connected, skipping');
      return;
    }

    if (this.connection) {
      await this.disconnect();
    }

    const token = this.authService.getToken();
    console.log('🔐 [RoleHubService] Auth Token:', token ? '✅ Present' : '❌ MISSING - This will cause connection failure!');

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl, {
        accessTokenFactory: () => token ?? '',
        withCredentials: false
      })
      .withAutomaticReconnect()
      .build();

    // Log connection state changes
    this.connection.onreconnecting((error) => {
      console.warn('⚠️ [RoleHubService] Reconnecting...', error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log('✅ [RoleHubService] Reconnected. ConnectionId:', connectionId);
    });

    this.connection.onclose((error) => {
      console.error('❌ [RoleHubService] Connection closed:', error);
    });

    // Listen to backend event
    this.connection.on('RoleUpdated', (payload: RoleUpdatedPayload) => {
      console.log('📨 [RoleHubService] RoleUpdated event RECEIVED:', payload);
      this.roleUpdatedSubject.next(payload);
    });

    try {
      await this.connection.start();
      console.log('✅ [RoleHubService] Connected successfully. ConnectionId:', this.connection.connectionId);
    } catch (error) {
      console.error('❌ [RoleHubService] Failed to connect:', error);
      throw error;
    }
  }

  // ===== Join Role Group =====
  async joinRole(organizationId: string, roleId: string): Promise<void> {
    console.log('👥 [RoleHubService] Attempting to join role group:', { organizationId, roleId });

    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.error('❌ [RoleHubService] Cannot join: SignalR not connected');
      throw new Error('SignalR is not connected.');
    }

    try {
      await this.connection.invoke('JoinRole', organizationId, roleId);
      const groupName = `role_${organizationId.trim()}_${roleId.trim()}`;
      console.log('✅ [RoleHubService] Joined group:', groupName);
    } catch (error) {
      console.error('❌ [RoleHubService] Failed to join role group:', error);
      throw error;
    }
  }

  // ===== Disconnect =====
  async disconnect(): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.stop();
    } finally {
      this.connection = null;
    }
  }
}