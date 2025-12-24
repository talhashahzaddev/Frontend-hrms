# Chatbot Integration Summary

## Overview
A minimalistic AI chatbot has been successfully integrated into your HRMS application. The chatbot features a clean, modern design that seamlessly matches your existing Hubstaff-inspired UI theme.

## What Was Created

### 1. Chatbot Service (`src/app/core/services/chatbot.service.ts`)
- Handles API communication with the chatbot endpoint
- Manages chat message history
- Persists chat history in localStorage
- API Endpoint: `POST https://localhost:60485/api/Chat/ask`
- Request format: `{ UserText: string }`
- Response: Plain text string

### 2. Chatbot Component (`src/app/shared/components/chatbot/`)
- **Component**: Standalone Angular component with full functionality
- **Template**: Clean, minimalistic chat UI
- **Styles**: Hubstaff-inspired design matching your app's color scheme

### 3. Features
✅ Floating action button (bottom-right corner)
✅ Expandable/collapsible chat window
✅ Minimize/maximize functionality
✅ Message history with timestamps
✅ Typing indicator while waiting for response
✅ Clear chat history option
✅ Smooth animations and transitions
✅ Responsive design (mobile-friendly)
✅ LocalStorage persistence
✅ Error handling with notifications

## Design Highlights
- **Colors**: Uses your existing CSS variables (primary-600, purple-600, gray shades)
- **Gradients**: Matches your app's gradient design
- **Shadows**: Consistent with your shadow system
- **Border Radius**: Uses your defined radius variables
- **Typography**: Inter font family (same as your app)
- **Icons**: Material Design icons
- **Animations**: Smooth cubic-bezier transitions

## Files Modified
1. ✅ `src/environments/environment.ts` - Added chatApiUrl
2. ✅ `src/environments/environment.prod.ts` - Added chatApiUrl for production
3. ✅ `src/app/layout/layout.component.ts` - Imported ChatbotComponent
4. ✅ `src/app/layout/layout.component.html` - Added chatbot selector

## Files Created
1. ✅ `src/app/core/services/chatbot.service.ts`
2. ✅ `src/app/shared/components/chatbot/chatbot.component.ts`
3. ✅ `src/app/shared/components/chatbot/chatbot.component.html`
4. ✅ `src/app/shared/components/chatbot/chatbot.component.scss`

## Configuration

### Development Environment
```typescript
chatApiUrl: 'https://localhost:60485/api/Chat/ask'
```

### Production Environment
Update the production chatbot URL in `environment.prod.ts`:
```typescript
chatApiUrl: 'https://your-production-api.com/api/Chat/ask'
```

## How It Works

### User Flow
1. User clicks the floating chat button (bottom-right)
2. Chat window opens with a welcome message
3. User types a message and presses Enter or clicks Send
4. Message is sent to the API endpoint
5. Bot response appears with typing animation
6. Chat history is saved automatically

### API Integration
```typescript
// Request
POST https://localhost:60485/api/Chat/ask
Content-Type: application/json

{
  "UserText": "User's message here"
}

// Response
"Bot's response as a plain string"
```

## Customization Options

### Change Chat Position
In `chatbot.component.scss`, modify:
```scss
.chat-toggle-button {
  bottom: 24px;  // Distance from bottom
  right: 24px;   // Distance from right
}
```

### Change Chat Window Size
```scss
.chat-window {
  width: 380px;
  height: 600px;
}
```

### Change Colors
The chatbot automatically uses your CSS variables. To customize:
- Header gradient: Uses `var(--gradient-primary)`
- User messages: Uses `var(--gradient-primary)`
- Bot messages: White with shadow
- Background: `var(--gray-50)`

## Browser Compatibility
✅ Chrome/Edge (latest)
✅ Firefox (latest)
✅ Safari (latest)
✅ Mobile browsers (iOS/Android)

## Additional Notes

### SSL Certificate
Since your API uses `https://localhost:60485`, you may need to:
1. Accept the self-signed certificate in your browser, or
2. Add a proper SSL certificate to your local API

### CORS Configuration
Ensure your API allows requests from your Angular app's origin:
```csharp
// In your API Startup/Program.cs
services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", builder =>
    {
        builder.WithOrigins("http://localhost:4200")
               .AllowAnyMethod()
               .AllowAnyHeader();
    });
});
```

### Future Enhancements
Consider adding:
- Message formatting (markdown support)
- File upload capability
- Voice input/output
- Quick reply buttons
- Chat history export
- Multiple chat sessions
- User typing indicators

## Testing
To test the chatbot:
1. Start your Angular app: `ng serve`
2. Ensure your API is running at `https://localhost:60485`
3. Click the chat button in the bottom-right corner
4. Type a message and send it
5. Verify the response appears correctly

## Support
If you encounter any issues:
- Check browser console for errors
- Verify API is running and accessible
- Check CORS configuration
- Ensure SSL certificate is accepted
- Review network tab for failed requests

---
**Integration Complete!** 🎉

The chatbot is now seamlessly integrated into your HRMS application with a design that perfectly matches your existing UI theme.
