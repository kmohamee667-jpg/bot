# Voice Privacy Options TODO

## Steps:
1. ✅ [DONE] Create TODO.md with plan steps
2. ✅ [DONE] Update models/PrivateVC.js: Add privacyMode field to schema
3. ✅ [DONE] Update events/interactionCreate.js: Extend privacy_menu options + handle new privacy selections (perms for all/female/male)
4. ✅ [DONE] Update events/voiceStateUpdate.js: Apply privacyMode perms on room creation + send settings embed summary post-creation
5. Test changes (restart bot, create room, test privacy options, persistence)
6. attempt_completion

