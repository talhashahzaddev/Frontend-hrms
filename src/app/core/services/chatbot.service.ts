import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { NotificationService } from './notification.service';

export interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export interface ChatRequest {
  UserText: string;
}

export interface ChatResponse {
  response: string;
  intent: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatbotService {
  private chatApiUrl = `${environment.apiUrl}/Chat/ask`;
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  constructor(
    private http: HttpClient,
    private notificationService: NotificationService
  ) {
    // Load chat history from localStorage if available
    this.loadChatHistory();
  }

  /**
   * Send a message to the chatbot API
   */
  sendMessage(userText: string): Observable<ChatResponse> {
    const request: ChatRequest = { UserText: userText };
    
    // Add user message to chat
    this.addMessage(userText, true);

    return this.http.post<ChatResponse>(this.chatApiUrl, request, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }).pipe(
      tap((response: ChatResponse) => {
        // Add bot response to chat - extract only the response text
        this.addMessage(response.response, false);
        this.saveChatHistory();
      }),
      catchError((error) => {
        this.notificationService.showError('Failed to get response from chatbot');
        this.addMessage('Sorry, I encountered an error. Please try again.', false);
        throw error;
      })
    );
  }

  /**
   * Add a message to the chat history
   */
  private addMessage(text: string, isUser: boolean): void {
    const messages = this.messagesSubject.value;
    const newMessage: ChatMessage = {
      id: this.generateId(),
      text,
      isUser,
      timestamp: new Date()
    };
    
    this.messagesSubject.next([...messages, newMessage]);
  }

  /**
   * Clear all chat messages
   */
  clearChat(): void {
    this.messagesSubject.next([]);
    this.saveChatHistory();
  }

  /**
   * Save chat history to localStorage
   */
  private saveChatHistory(): void {
    const messages = this.messagesSubject.value;
    localStorage.setItem('chatbot_history', JSON.stringify(messages));
  }

  /**
   * Load chat history from localStorage
   */
  private loadChatHistory(): void {
    const savedHistory = localStorage.getItem('chatbot_history');
    if (savedHistory) {
      try {
        const messages = JSON.parse(savedHistory);
        this.messagesSubject.next(messages);
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
    }
  }

  /**
   * Generate a unique ID for messages
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current messages
   */
  getMessages(): ChatMessage[] {
    return this.messagesSubject.value;
  }
}
