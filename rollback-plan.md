# Receipt Security Rollback Plan

## 🚨 Emergency Rollback

If the receipt security implementation causes issues, follow this rollback plan:

### Quick Rollback (5 minutes)

1. **Revert to previous commit:**
   ```bash
   git log --oneline -10  # Find the commit before receipt security changes
   git revert <commit-hash>  # Revert the security changes
   ```

2. **Or restore previous files:**
   ```bash
   git checkout HEAD~1 -- src/services/firestoreService.ts
   git checkout HEAD~1 -- src/services/autoReceiptService.ts
   git checkout HEAD~1 -- src/services/firebaseService.ts
   git checkout HEAD~1 -- src/services/receiptSyncService.ts
   git checkout HEAD~1 -- src/services/realtimeSyncService.ts
   ```

### Feature Flag Rollback (2 minutes)

If you have a feature flag system, disable the new receipt filtering:

```typescript
// In your app config
const USE_SERVER_SIDE_FILTERING = false; // Set to false to disable

// In your services, wrap the new logic:
if (USE_SERVER_SIDE_FILTERING) {
  // New server-side filtering logic
} else {
  // Old client-side filtering logic
}
```

### Database Rules Rollback

1. **Firestore Rules:**
   ```bash
   # Restore previous firestore.rules
   git checkout HEAD~1 -- firestore.rules
   firebase deploy --only firestore:rules
   ```

2. **Realtime Database Rules:**
   ```bash
   # Restore previous database.rules.json
   git checkout HEAD~1 -- database.rules.json
   firebase deploy --only database
   ```

## 🔍 Troubleshooting

### If receipts are not loading:

1. **Check console logs for errors:**
   - Look for "SECURITY" error messages
   - Check for Firebase permission errors

2. **Verify account ID:**
   ```javascript
   console.log('Current account ID:', restaurantId);
   ```

3. **Test with debug script:**
   ```bash
   node test-receipt-security.js
   ```

### If you see "Security violation" errors:

1. **Check if receipts have correct accountId:**
   - Some legacy receipts might not have `restaurantId` field
   - Update them or handle gracefully

2. **Verify Firebase rules are deployed:**
   - Go to Firebase Console > Firestore Database > Rules
   - Ensure rules are active and match the updated rules

## 📞 Support Contacts

- **Firebase Console:** https://console.firebase.google.com/
- **Project:** dbarbi-4c494
- **Emergency Contact:** [Your contact info]

## 📋 Rollback Checklist

- [ ] Revert code changes
- [ ] Deploy previous Firebase rules
- [ ] Test receipt loading
- [ ] Verify no security violations
- [ ] Update team about rollback
- [ ] Document issues for future fix

## 🔄 Re-implementation Plan

After rollback, to re-implement safely:

1. **Phase 1:** Deploy rules first, test with existing code
2. **Phase 2:** Update one service at a time
3. **Phase 3:** Add comprehensive logging
4. **Phase 4:** Test thoroughly before full deployment
5. **Phase 5:** Monitor for 24 hours before considering stable


















