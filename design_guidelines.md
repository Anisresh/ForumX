# WhatsApp-Style Chat App Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from WhatsApp's proven messaging interface patterns, complemented by modern messaging apps like Telegram and Signal for enhanced UX patterns.

## Core Design Elements

### Color Palette
**Primary Colors:**
- WhatsApp Green: 142 70% 49% (main brand color)
- Dark Green: 142 70% 35% (headers, active states)
- Light Green: 142 40% 85% (user message bubbles)

**Supporting Colors:**
- Chat Gray: 220 9% 96% (received message bubbles)
- Background: 220 9% 98% (main background)
- Border Gray: 220 9% 90% (dividers, borders)
- Text Primary: 220 9% 15%
- Text Secondary: 220 9% 45%

**Dark Mode:**
- Background Dark: 220 9% 8%
- Surface Dark: 220 9% 12%
- Message Bubble Dark: 220 9% 15%

### Typography
- **Primary Font**: Inter via Google Fonts CDN
- **Message Text**: 14px regular weight
- **Contact Names**: 16px medium weight
- **Headers**: 18px semibold
- **Timestamps**: 12px regular, secondary color

### Layout System
**Spacing Units**: Consistent use of Tailwind units 1, 2, 3, 4, 6, 8, 12
- **Padding**: p-3 for message bubbles, p-4 for containers
- **Margins**: m-2 for small spacing, m-4 for section separation
- **Heights**: h-12 for input fields, h-16 for chat headers

### Component Library

**Navigation:**
- Fixed header with contact name/group title
- Back button (mobile) and contact info icon
- Three-dot menu for chat options

**Chat Interface:**
- Message bubbles with rounded corners (rounded-2xl)
- Right-aligned user messages (green), left-aligned received (gray)
- Message timestamps in bottom corner
- Status indicators (single/double checkmarks)

**Input Area:**
- Fixed bottom input with rounded border
- Attach button, text input, send button layout
- Voice message button when text is empty

**Contact List:**
- Avatar circles (w-12 h-12)
- Two-line layout: name and last message preview
- Timestamp on right side
- Unread message count badges

**Forms:**
- Clean input fields with subtle borders
- Profile setup with avatar upload
- Contact search with real-time filtering

### Animations
**Minimal Animations:**
- Message send animation (scale + fade)
- Typing indicator (three dots pulsing)
- New message arrival (gentle slide-in)
- No complex transitions or effects

## Layout Structure

**Main Layout:**
- Three-panel desktop layout: contacts sidebar, chat area, optional info panel
- Mobile: Single-panel navigation between contacts and active chat
- Responsive breakpoint at md (768px)

**Chat Area:**
- Scrollable message history with auto-scroll to bottom
- Fixed header and input area
- Message grouping by time (date separators)

## Key Interactions

**Message Flow:**
- Click contact to open chat
- Type and send messages with Enter key
- Tap and hold for message options (mobile)
- Pull to refresh for message history

**Contact Management:**
- Search contacts with instant filtering
- Add new contacts via phone number
- Profile views with contact details

**Status Indicators:**
- Single checkmark: sent
- Double checkmark: delivered
- Blue double checkmark: read
- Clock icon: sending

## Mobile-First Considerations

**Touch Targets:**
- Minimum 44px touch targets for all interactive elements
- Adequate spacing between clickable items
- Swipe gestures for message actions

**Performance:**
- Virtual scrolling for long message histories
- Optimistic UI updates for message sending
- Efficient re-rendering for real-time updates

## Images
No hero images required. Profile avatars throughout using placeholder circles with user initials when no photo uploaded. Contact list uses small circular avatars (48px), chat headers use medium avatars (64px), and profile pages use large avatars (128px).