import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { MessageService } from 'primeng/api';

export interface NotificationConfig {
  title?: string;
  message: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(
    private toastr: ToastrService,
    private messageService: MessageService
  ) {}

  success(config: NotificationConfig | string): void {
    if (typeof config === 'string') {
      config = { message: config };
    }
    
    this.toastr.success(config.message, config.title || 'Success', {
      timeOut: config.duration || 3000,
      progressBar: true,
      closeButton: true
    });

    this.messageService.add({
      severity: 'success',
      summary: config.title || 'Success',
      detail: config.message,
      life: config.duration || 3000
    });
  }

  error(config: NotificationConfig | string): void {
    if (typeof config === 'string') {
      config = { message: config };
    }
    
    this.toastr.error(config.message, config.title || 'Error', {
      timeOut: config.duration || 5000,
      progressBar: true,
      closeButton: true
    });

    this.messageService.add({
      severity: 'error',
      summary: config.title || 'Error',
      detail: config.message,
      life: config.duration || 5000
    });
  }

  warning(config: NotificationConfig | string): void {
    if (typeof config === 'string') {
      config = { message: config };
    }
    
    this.toastr.warning(config.message, config.title || 'Warning', {
      timeOut: config.duration || 4000,
      progressBar: true,
      closeButton: true
    });

    this.messageService.add({
      severity: 'warn',
      summary: config.title || 'Warning',
      detail: config.message,
      life: config.duration || 4000
    });
  }

  info(config: NotificationConfig | string): void {
    if (typeof config === 'string') {
      config = { message: config };
    }
    
    this.toastr.info(config.message, config.title || 'Info', {
      timeOut: config.duration || 3000,
      progressBar: true,
      closeButton: true
    });

    this.messageService.add({
      severity: 'info',
      summary: config.title || 'Info',
      detail: config.message,
      life: config.duration || 3000
    });
  }

  clear(): void {
    this.toastr.clear();
    this.messageService.clear();
  }

  // Specific notification methods for common scenarios
  loginSuccess(userName: string): void {
    this.success({
      title: 'Welcome Back!',
      message: `Hello ${userName}, you've successfully logged in.`
    });
  }

  logoutSuccess(): void {
    this.info({
      title: 'Logged Out',
      message: 'You have been successfully logged out.'
    });
  }

  saveSuccess(entityName: string = 'Record'): void {
    this.success({
      message: `${entityName} has been saved successfully.`
    });
  }

  deleteSuccess(entityName: string = 'Record'): void {
    this.success({
      message: `${entityName} has been deleted successfully.`
    });
  }

  validationError(message?: string): void {
    this.error({
      title: 'Validation Error',
      message: message || 'Please check your input and try again.'
    });
  }

  networkError(): void {
    this.error({
      title: 'Network Error',
      message: 'Unable to connect to the server. Please check your internet connection.'
    });
  }

  permissionDenied(): void {
    this.warning({
      title: 'Access Denied',
      message: 'You do not have permission to perform this action.'
    });
  }

  // Alias methods for compatibility
  showSuccess(message: string): void {
    this.success(message);
  }

  showError(message: string): void {
    this.error(message);
  }

  showWarning(message: string): void {
    this.warning(message);
  }

  showInfo(message: string): void {
    this.info(message);
  }
}
