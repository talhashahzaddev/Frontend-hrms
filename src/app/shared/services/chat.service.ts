import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isLoading?: boolean;
  intent?: string;
  module?: string;
}

interface ChatRequestDto {
  message: string;
}

interface ChatResponseDto {
  responseText: string;
  intent: string;
  module: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private messages: ChatMessage[] = [];
  private readonly apiUrl = `${environment.apiUrl}/Chat`;

  constructor(private http: HttpClient) {}

  sendMessage(message: string, skipUserMessage: boolean = false): Observable<ChatMessage> {
    // Add user message to local storage immediately (unless component handles it)
    if (!skipUserMessage) {
      const userMessage: ChatMessage = {
        id: this.generateId(),
        text: message,
        sender: 'user',
        timestamp: new Date()
      };
      
      this.messages.push(userMessage);
    }
    
    // Prepare request
    const request: ChatRequestDto = {
      message: message
    };

    // Call the API
    return this.http.post<ChatResponseDto>(`${this.apiUrl}/message`, request).pipe(
      map((response: ChatResponseDto) => {
        // Check if response is valid and has content
        if (!response || !response.responseText || response.responseText.trim() === '') {
          // Throw error to be caught by catchError
          throw new Error('EMPTY_RESPONSE');
        }
        
        // Convert API response to ChatMessage
        const aiMessage: ChatMessage = {
          id: this.generateId(),
          text: response.responseText,
          sender: 'ai',
          timestamp: new Date(),
          intent: response.intent,
          module: response.module
        };
        
        // Add AI response to messages
        this.messages.push(aiMessage);
        
        return aiMessage;
      }),
      catchError((error) => {
        console.error('Error sending chat message:', error);
        
        // Check if error message was already added (for empty response case)
        // We add it here to handle all error cases consistently
        const errorMessage: ChatMessage = {
          id: this.generateId(),
          text: 'The server is not responding',
          sender: 'ai',
          timestamp: new Date()
        };
        
        // Only add if not already present (check last message)
        const lastMessage = this.messages[this.messages.length - 1];
        if (!lastMessage || lastMessage.text !== 'The server is not responding' || lastMessage.sender !== 'ai') {
          this.messages.push(errorMessage);
        }
        
        return throwError(() => error);
      })
    );
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

