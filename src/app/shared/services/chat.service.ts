import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isLoading?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messages: ChatMessage[] = [];

  constructor() {}

  // This will be connected to your backend API later
  sendMessage(message: string): Observable<ChatMessage> {
    const userMessage: ChatMessage = {
      id: this.generateId(),
      text: message,
      sender: 'user',
      timestamp: new Date()
    };
    
    this.messages.push(userMessage);
    
    // TODO: Replace with actual API call
    // Example: return this.http.post<ChatMessage>('/api/chat', { message });
    
    // For now, return mock response (frontend only)
    const aiResponse: ChatMessage = {
      id: this.generateId(),
      text: 'This is a placeholder response. Backend integration will be implemented later.',
      sender: 'ai' as const,
      timestamp: new Date()
    };
    
    return of(aiResponse).pipe(delay(1000));
  }

  getMessages(): ChatMessage[] {
    return this.messages;
  }

  clearMessages(): void {
    this.messages = [];
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

