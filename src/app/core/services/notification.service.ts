import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { MessageService } from 'primeng/api';

export interface NotificationConfig {
  title?: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  // 👉 Toggle this flag based on where you want to show the message
  // false = use ngx-toastr only
  // true  = use PrimeNG only
  private usePrimeNG = false;

  constructor(
    private toastr: ToastrService,
    private messageService: MessageService
  ) {}

  /** Toggle between PrimeNG and Toastr globally */
  setNotificationMode(usePrimeNG: boolean): void {
    this.usePrimeNG = usePrimeNG;
  }

  // ✅ Unified notification helpers
  success(config: NotificationConfig | string): void {
    if (typeof config === 'string') config = { message: config };
    this.usePrimeNG
      ? this.messageService.add({ severity: 'success', summary: config.title || 'Success', detail: config.message })
      : this.toastr.success(config.message, config.title || 'Success', { timeOut: config.duration || 3000, progressBar: true, closeButton: true });
  }

  error(config: NotificationConfig | string): void {
    if (typeof config === 'string') config = { message: config };
    this.usePrimeNG
      ? this.messageService.add({ severity: 'error', summary: config.title || 'Error', detail: config.message })
      : this.toastr.error(config.message, config.title || 'Error', { timeOut: config.duration || 5000, progressBar: true, closeButton: true });
  }

  warning(config: NotificationConfig | string): void {
    if (typeof config === 'string') config = { message: config };
    this.usePrimeNG
      ? this.messageService.add({ severity: 'warn', summary: config.title || 'Warning', detail: config.message })
      : this.toastr.warning(config.message, config.title || 'Warning', { timeOut: config.duration || 4000, progressBar: true, closeButton: true });
  }

  info(config: NotificationConfig | string): void {
    if (typeof config === 'string') config = { message: config };
    this.usePrimeNG
      ? this.messageService.add({ severity: 'info', summary: config.title || 'Info', detail: config.message })
      : this.toastr.info(config.message, config.title || 'Info', { timeOut: config.duration || 3000, progressBar: true, closeButton: true });
  }

  clear(): void {
    this.toastr.clear();
    this.messageService.clear();
  }

  // ✅ Optional HRMS shortcuts
  loginSuccess(userName: string): void {
    this.success({ title: 'Welcome Back!', message: `Hello ${userName}, you’ve successfully logged in.` });
  }

  logoutSuccess(): void {
    this.info({ title: 'Logged Out', message: 'You have been successfully logged out.' });
  }

  saveSuccess(entityName = 'Record'): void {
    this.success({ message: `${entityName} has been saved successfully.` });
  }

  deleteSuccess(entityName = 'Record'): void {
    this.success({ message: `${entityName} has been deleted successfully.` });
  }

  validationError(message?: string): void {
    this.error({ title: 'Validation Error', message: message || 'Please check your input and try again.' });
  }

  networkError(): void {
    this.error({ title: 'Network Error', message: 'Unable to connect to the server. Please check your internet connection.' });
  }

  permissionDenied(): void {
    this.warning({ title: 'Access Denied', message: 'You do not have permission to perform this action.' });
  }
// ✅ Backward compatibility aliases
showSuccess(message: string, title?: string): void {
  this.success({ message, title });
}

showError(message: string, title?: string): void {
  this.error({ message, title });
}

showInfo(message: string, title?: string): void {
  this.info({ message, title });
}

showWarning(message: string, title?: string): void {
  this.warning({ message, title });
}

}
