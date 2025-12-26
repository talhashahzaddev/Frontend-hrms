import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from '../../shared/services/chat.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.scss']
})
export class AiAssistantComponent implements OnInit, OnDestroy {
  messages: ChatMessage[] = [];
  newMessage = '';
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.loadMessages();
    // Scroll to bottom on init
    setTimeout(() => this.scrollToBottom(), 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || this.isLoading) {
      return;
    }

    const messageText = this.newMessage.trim();
    this.newMessage = '';
    
    // Show typing indicator
    this.isLoading = true;
    
    // Call API - service will add user message synchronously before API call
    const messageObservable = this.chatService.sendMessage(messageText, false);
    
    // Immediately update UI with user message from service (added synchronously)
    // This ensures the user message appears instantly before API response
    this.messages = [...this.chatService.getMessages()];
    this.scrollToBottom();
    
    // Subscribe to get AI response
    messageObservable
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Reload messages from service - it has both user and AI messages in correct order
          this.messages = [...this.chatService.getMessages()];
          this.isLoading = false;
          // Small delay to ensure DOM updates before scrolling
          setTimeout(() => this.scrollToBottom(), 50);
        },
        error: (error) => {
          console.error('Error sending message:', error);
          // Reload messages to show error message if service added it
          this.messages = [...this.chatService.getMessages()];
          this.isLoading = false;
          setTimeout(() => this.scrollToBottom(), 50);
        }
      });
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    this.chatService.clearMessages();
    this.messages = [];
  }

  private loadMessages(): void {
    this.messages = this.chatService.getMessages();
  }

  private scrollToBottom(): void {
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      setTimeout(() => {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      }, 50);
    });
  }
}

