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

export interface EmployeeUpdatedPayload {
  EmployeeId: string;
  OrganizationId: string;
  Message: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoleHubService {

  private readonly authService = inject(AuthService);
  private connection: signalR.HubConnection | null = null;

  private readonly roleUpdatedSubject = new Subject<RoleUpdatedPayload>();
  readonly roleUpdated$ = this.roleUpdatedSubject.asObservable();

  private readonly employeeUpdatedSubject = new Subject<EmployeeUpdatedPayload>();
  readonly employeeUpdated$ = this.employeeUpdatedSubject.asObservable();

  get isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected;
  }

  get connectionId(): string | undefined {
    return this.connection?.connectionId ?? undefined;
  }

  private get hubUrl(): string {
    const base = environment.apiUrl.replace(/\/api\/?$/i, '');
    return `${base}/hubs/permissionHub`;
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
        withCredentials: false
      })
      .withAutomaticReconnect()
      .build();

    this.connection.onreconnecting(error => {
      console.warn('SignalR reconnecting...', error);
    });

    this.connection.onreconnected(id => {
      console.log('SignalR reconnected', id);
    });

    this.connection.onclose(error => {
      console.error('SignalR closed', error);
    });

    // Role permission updated
    this.connection.on('RoleUpdated', (payload: RoleUpdatedPayload) => {

      console.log('RoleUpdated', payload);

      this.roleUpdatedSubject.next(payload);

    });

    // Employee position updated
    this.connection.on('EmployeeUpdated', (payload: EmployeeUpdatedPayload) => {

      console.log('EmployeeUpdated', payload);

      this.employeeUpdatedSubject.next(payload);

    });

    await this.connection.start();

    console.log('SignalR Connected', this.connection.connectionId);
  }

  async joinRole(
    organizationId: string,
    roleId: string
  ): Promise<void> {

    if (!this.connection ||
        this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR not connected');
    }

    await this.connection.invoke(
      'JoinRole',
      organizationId,
      roleId
    );

    console.log(`Joined role_${organizationId}_${roleId}`);
  }

  async joinEmployee(
    organizationId: string,
    employeeId: string
  ): Promise<void> {

    if (!this.connection ||
        this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR not connected');
    }

    await this.connection.invoke(
      'JoinEmployee',
      organizationId,
      employeeId
    );

    console.log(`Joined employee_${organizationId}_${employeeId}`);
  }

  async disconnect(): Promise<void> {

    if (!this.connection) {
      return;
    }

    await this.connection.stop();

    this.connection = null;
  }
}