# Nested Receipts Rollback Plan

## 🚨 Emergency Rollback

If the nested receipts implementation causes issues, follow this rollback plan:

### Quick Rollback (5 minutes)

1. **Restore backup files:**
   ```bash
   # Restore the original firestoreService.ts
   cp src/services/firestoreService.backup.ts src/services/firestoreService.ts
   
   # Restore original autoReceiptService.ts (if you have a backup)
   git checkout HEAD~1 -- src/services/autoReceiptService.ts
   ```

2. **Revert to previous commit:**
   ```bash
   git log --oneline -10  # Find the commit before nested receipts changes
   git revert <commit-hash>  # Revert the nested receipts changes
   ```

### Database Rules Rollback

1. **Firestore Rules:**
   ```bash
   # Restore previous firestore.rules
   git checkout HEAD~1 -- firestore.rules
   firebase deploy --only firestore:rules
   ```

### Manual Rollback Steps

1. **Restore firestoreService.ts:**
   - Copy contents from `src/services/firestoreService.backup.ts`
   - Replace `src/services/firestoreService.ts`

2. **Restore autoReceiptService.ts:**
   - Revert to the previous implementation that used the class-based approach

3. **Update imports:**
   - Ensure all files importing from firestoreService use the correct class-based imports

## 🔍 Troubleshooting

### If receipts are not loading:

1. **Check console logs for errors:**
   - Look for "SECURITY" error messages
   - Check for Firebase permission errors
   - Look for "The query requires an index" errors

2. **Verify restaurant ID:**
   ```javascript
   console.log('Current restaurant ID:', restaurantId);
   ```

3. **Test with debug script:**
   ```bash
   node test-nested-receipts.js
   ```

### If you see "Security violation" errors:

1. **Check if receipts have correct restaurantId:**
   - Some legacy receipts might not have `restaurantId` field
   - Update them or handle gracefully

2. **Verify Firebase rules are deployed:**
   - Go to Firebase Console > Firestore Database > Rules
   - Ensure rules are active and match the updated rules

### If you see index errors:

1. **Create the required index:**
   ```bash
   node create-firestore-index.js
   ```

2. **Or remove orderBy clause temporarily:**
   - Edit `firestoreService.ts` to remove `orderBy("timestamp", "desc")`
   - Use client-side sorting instead

## 📞 Support Contacts

- **Firebase Console:** https://console.firebase.google.com/
- **Project:** dbarbi-4c494
- **Emergency Contact:** [Your contact info]

## 📋 Rollback Checklist

- [ ] Restore firestoreService.ts from backup
- [ ] Restore autoReceiptService.ts from backup
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

## 📝 Files Changed

- `src/services/firestoreService.ts` - Complete rewrite to use nested paths
- `src/services/autoReceiptService.ts` - Updated to use new service
- `src/services/receiptSyncService.ts` - Updated to use new service
- `firestore.rules` - Updated for nested path security
- `src/screens/Receipts/DailySummaryScreen.tsx` - Added canary logging

## 🎯 Expected Behavior After Rollback

- Receipts should load from the original collection structure
- No "SECURITY" error messages
- All existing functionality should work as before
- No index errors






















