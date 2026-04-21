# Ticket Deletion & Embed Fix Plan

## Status: In Progress

### [✅] Step 1: Enhance open ticket check with channel existence
- Edit ticket/ticketManager.js handleCreateTicket: check channel exists, clean stale if deleted

### [✅] Step 2: Fix handleDeleteTicket DB update
- Edit ticket/ticketManager.js: updateStatus before delete

### [✅] Step 3: Convert ticket responses to embeds
- Spam reply, errors to embeds in ticket/ticketManager.js

### [✅] Step 4: Global embed conversion in interactionCreate.js
- Plain content -> embeds except mentions (major ones done)

### [✅] Step 5: Add channelDelete event listener
- Create events/channelDelete.js
- Register in bot.js

### [ ] Step 6: Test

**Next: Step 1 & 2**
