import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.scss']
})
export class ChatWidgetComponent implements OnInit, OnDestroy {
  isOpen = false;
  messages: ChatMessage[] = [];
  newMessage = '';
  isLoading = false;
  private destroy$ = new Subject<void>();

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.loadMessages();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleChat(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.scrollToBottom();
    }
  }

  closeChat(): void {
    this.isOpen = false;
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || this.isLoading) {
      return;
    }

    const messageText = this.newMessage.trim();
    this.newMessage = '';
    this.isLoading = true;

    this.chatService.sendMessage(messageText)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.messages.push(response);
          this.isLoading = false;
          this.scrollToBottom();
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.isLoading = false;
        }
      });
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private loadMessages(): void {
    this.messages = this.chatService.getMessages();
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 100);
  }
}


