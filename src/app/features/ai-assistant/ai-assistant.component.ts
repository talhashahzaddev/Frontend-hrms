import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatService, ChatMessage } from '../../shared/services/chat.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface FormattedMessagePart {
  type: 'text' | 'url' | 'linebreak';
  content: string;
  url?: string;
}

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

  constructor(
    private chatService: ChatService,
    private router: Router
  ) {}

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

