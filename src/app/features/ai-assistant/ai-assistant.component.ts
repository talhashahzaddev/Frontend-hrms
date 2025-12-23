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
    
    // Add user message immediately to show it right away
    const userMessage: ChatMessage = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };
    this.messages.push(userMessage);
    
    // Show typing indicator
    this.isLoading = true;
    
    // Scroll to show typing indicator
    this.scrollToBottom();

    // Call API (skip user message since we already added it)
    this.chatService.sendMessage(messageText, true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Reload messages to get AI response from service
          // The user message is already in our local array, service adds AI response
          const serviceMessages = this.chatService.getMessages();
          // Merge to ensure we have all messages (user message + AI response)
          this.messages = serviceMessages.length > this.messages.length 
            ? serviceMessages 
            : [...this.messages, response];
          this.isLoading = false;
          // Small delay to ensure DOM updates before scrolling
          setTimeout(() => this.scrollToBottom(), 50);
        },
        error: (error) => {
          console.error('Error sending message:', error);
          // Reload messages to show error message if service added it
          const serviceMessages = this.chatService.getMessages();
          this.messages = serviceMessages.length > this.messages.length 
            ? serviceMessages 
            : this.messages;
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

