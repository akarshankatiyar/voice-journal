

## Problem

The `ConversationCard` component only navigates to a section page (e.g., `/todays-text`, `/academic-notes`) when tapped. It does **not** open a detail modal showing the conversation content/notes. When the user is already on `/todays-text` and taps a card, it just re-navigates to the same page — nothing visible happens.

The screenshot confirms: "YouTube Video Notes" cards with "Mixed" tag are on the Today's Text page. Tapping them triggers `navigate('/todays-text')` which is a no-op.

## Plan

### 1. Add a Conversation Detail Modal

Create `src/components/shared/ConversationDetailModal.tsx` — a modal that displays:
- Title, type badge, timestamp
- Full transcript or summary rendered via `MarkdownRenderer`
- Links to associated academic/meeting notes if `linkedSection` exists
- People mentioned chips

### 2. Update ConversationCard to open detail modal

Instead of navigating on click, the card should call an `onClick` callback that opens the detail modal with that conversation's data.

### 3. Update TodaysText page

- Add state for `selectedConversation`
- Pass `onClick` to each `ConversationCard` to set the selected conversation
- Render `ConversationDetailModal` with the selected conversation

### 4. Update Home page (Recent Activity section)

Same pattern — add state + modal for conversation detail view on the Home page's recent activity cards.

### 5. Update AllConversations page

Same pattern for the All Conversations page so tapping any card opens its detail modal.

### Files to modify
- **Create**: `src/components/shared/ConversationDetailModal.tsx`
- **Edit**: `src/components/shared/ConversationCard.tsx` — accept optional `onCardClick` prop
- **Edit**: `src/pages/TodaysText.tsx` — add modal state + render modal
- **Edit**: `src/pages/Home.tsx` — add modal state + render modal
- **Edit**: `src/pages/AllConversations.tsx` — add modal state + render modal

