# Ticket Claim System Rework - Progress Tracker

## Status: 🚀 In Progress

### 1. [ ] Update Ticket Schema
- File: `models/Ticket.js`
- Add: `claimPromptMessageId: { type: String, default: null }`

### 2. [ ] Add DB Function
- File: `ticket/database.js`
- Add: `updateClaimPromptMessageId(channelId, messageId)`

### 3. [ ] Update Embeds
- File: `ticket/buttonsHandler.js`
- Enhance `claimPromptEmbed` with full Arabic data
- Fix/enhance `claimConfirmEmbed`

### 4. [ ] Modify ticketManager.js
- confirmTicketCreation: Hide from ALL initially (only user), send claim prompt embed+button, store msg ID
- handleClaimTicket: Grant perms to allowedRoles, send claim embed, edit prompt msg

### 5. [ ] Test & Restart Bot
- Verify hiding/claiming/showing
- Check edits/logs

**Next: Schema update first.**

