import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatService, ChatMessage } from '../../services/chat.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface FormattedMessagePart {
  type: 'text' | 'url' | 'linebreak';
  content: string;
  url?: string;
}

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

  constructor(
    private chatService: ChatService,
    private router: Router
  ) {}

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

  navigateToAiAssistant(): void {
    // Close the chat widget
    this.isOpen = false;
    // Navigate to the main AI Assistant page
    // The chat history will be preserved since both components use the same ChatService
    this.router.navigate(['/ai-assistant']);
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
          // Message is already added to service, just reload
          this.messages = this.chatService.getMessages();
          this.isLoading = false;
          this.scrollToBottom();
        },
        error: (error) => {
          console.error('Error sending message:', error);
          // Reload messages to show error message - service already added it
          this.messages = this.chatService.getMessages();
          this.isLoading = false;
          this.scrollToBottom();
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
    setTimeout(() => {
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 100);
  }

  /**
   * Parse message text to handle newlines and detect URLs
   * Returns an array of parts that can be rendered
   */
  formatMessage(text: string): FormattedMessagePart[] {
    if (!text) return [];
    
    const parts: FormattedMessagePart[] = [];
    // URL regex pattern - matches http/https URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Split by URLs first
    const urlMatches = Array.from(text.matchAll(urlRegex));
    let lastIndex = 0;
    
    if (urlMatches.length === 0) {
      // No URLs, just handle newlines
      return this.splitByNewlines(text);
    }
    
    urlMatches.forEach((match) => {
      const matchIndex = match.index!;
      const url = match[0];
      
      // Add text before URL (if any)
      if (matchIndex > lastIndex) {
        const textBefore = text.substring(lastIndex, matchIndex);
        parts.push(...this.splitByNewlines(textBefore));
      }
      
      // Add URL
      parts.push({
        type: 'url',
        content: this.getUrlDisplayText(url),
        url: url
      });
      
      lastIndex = matchIndex + url.length;
    });
    
    // Add remaining text after last URL
    if (lastIndex < text.length) {
      const textAfter = text.substring(lastIndex);
      parts.push(...this.splitByNewlines(textAfter));
    }
    
    return parts;
  }

  /**
   * Split text by newlines and create parts
   */
  private splitByNewlines(text: string): FormattedMessagePart[] {
    const parts: FormattedMessagePart[] = [];
    const lines = text.split(/\n/);
    
    lines.forEach((line, index) => {
      if (line.trim()) {
        parts.push({
          type: 'text',
          content: line
        });
      }
      
      // Add linebreak after each line except the last
      if (index < lines.length - 1) {
        parts.push({
          type: 'linebreak',
          content: ''
        });
      }
    });
    
    return parts;
  }

  /**
   * Extract display text from URL
   */
  private getUrlDisplayText(url: string): string {
    try {
      const urlObj = new URL(url);
      // Extract pathname and make it readable
      const path = urlObj.pathname;
      if (path === '/' || !path) {
        return 'Visit Page';
      }
      
      // Convert /performance/dashboard to "Performance Dashboard"
      const segments = path.split('/').filter(s => s);
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        return this.formatRouteName(lastSegment);
      }
      
      return 'Visit Page';
    } catch {
      return 'Visit Link';
    }
  }

  /**
   * Format route name to readable text
   */
  private formatRouteName(route: string): string {
    // Convert kebab-case or camelCase to Title Case
    return route
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Navigate to URL
   */
  navigateToUrl(url: string): void {
    try {
      const urlObj = new URL(url);
      // Extract pathname from full URL
      const path = urlObj.pathname;
      
      // Navigate using Angular Router
      this.router.navigate([path]).catch(err => {
        console.error('Navigation error:', err);
        // Fallback: open in new tab
        window.open(url, '_blank');
      });
    } catch (error) {
      console.error('Invalid URL:', error);
      // Fallback: try to open as-is
      window.open(url, '_blank');
    }
  }
}


