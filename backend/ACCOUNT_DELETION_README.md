# Account Deletion and Data Integrity

This document outlines the changes made to implement soft deletion of user accounts while maintaining data integrity across the application.

## Changes Made

### 1. User Model Updates
- Added `isDeleted` (Boolean) - Marks if the account is soft-deleted
- Added `deletedAt` (Date) - When the account was deleted
- Added `originalEmail` (String) - Stores the original email before hashing
- Added pre-save hook to handle email hashing on deletion
- Added static methods for querying active/deleted users

### 2. Message Model Updates
- Made `userId` optional to handle deleted users
- Added `userInfo` (Object) - Denormalized user data at time of message creation
- Added `isUserDeleted` (Boolean) - Indicates if the message sender is deleted
- Updated reactions to include denormalized user info
- Added pre-save hook to populate user info
- Added static method to handle user deletion

### 3. Authentication Updates
- Updated auth middleware to handle soft-deleted users
- Added `requireActiveAccount` middleware to protect routes
- Added `isAccountOwner` middleware for account ownership checks
- Improved error handling and responses

### 4. New API Endpoints
- `DELETE /api/account` - Soft delete current user's account
- `POST /api/account/recover` - Recover a soft-deleted account
- `POST /api/account/cleanup` - Permanently delete old soft-deleted accounts (admin only)

## Data Migration

### Running the Migration

1. First, ensure your MongoDB connection is properly configured in `.env`

2. Run the message migration script to backfill user info in existing messages:
   ```bash
   node scripts/run-migration.js
   ```

3. The script will:
   - Find all messages without userInfo
   - Populate userInfo with data from the User collection
   - Mark messages from deleted users appropriately

## Testing

### Test Cases

1. **Account Deletion**
   - User can delete their account
   - Deleted user cannot log in
   - User's email is hashed
   - Original email is stored securely

2. **Message Persistence**
   - Messages from deleted users remain visible
   - User info is preserved in messages
   - Reactions from deleted users are handled

3. **Account Recovery**
   - User can recover their account
   - Original email is restored
   - Account is fully functional after recovery

4. **Data Cleanup**
   - Old deleted accounts can be purged
   - Only accounts past retention period are affected

## Environment Variables

Add these to your `.env` file:

```
# Account deletion settings
ACCOUNT_RETENTION_DAYS=7   # Days to keep soft-deleted accounts
```

## Maintenance

### Scheduled Cleanup

Set up a scheduled job (e.g., using cron) to run the cleanup endpoint periodically:

```bash
# Example: Run cleanup every Sunday at 2 AM
0 2 * * 0 curl -X POST http://your-api-url/api/account/cleanup -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Rollback Plan

If issues arise, you can rollback by:

1. Restoring from backup (always have a backup before migration)
2. Reverting the code changes
3. Dropping any new indexes
4. Removing the new fields via MongoDB:
   ```javascript
   // Run in MongoDB shell
   db.users.updateMany(
     { isDeleted: { $exists: true } },
     { 
       $unset: { isDeleted: "", deletedAt: "", originalEmail: "" },
       $set: { email: "$originalEmail" }
     }
   )
   ```

## Notes

- The system now handles deleted users gracefully throughout the application
- All new code includes proper error handling and logging
- Database indexes have been added for performance
- The implementation follows security best practices
