# Offline-First Chat Implementation

## Overview

Chat app sekarang mendukung **offline-first capability**, di mana messages tetap tersimpan di local storage dan otomatis terkirim ketika koneksi kembali.

## Features Implemented

### 1. **Offline Queue System** (`useOfflineQueueStore`)

- Menyimpan messages yang gagal terkirim ke dalam queue
- Queue di-persist di `localStorage` dengan key `offline-queue-storage`
- Status message: `pending`, `sending`, `sent`, `failed`

### 2. **Network Status Detection** (`useNetworkStatus`)

- Detect real-time online/offline status
- Listen ke browser `online` dan `offline` events
- Update store status secara otomatis

### 3. **Auto-Sync Mechanism** (`useOfflineSync`)

- Otomatis sync queue ketika koneksi kembali online
- Retry mechanism dengan max 3 attempts
- Delay 2 detik antar retry
- Messages di-sync satu-persatu untuk maintain order

### 4. **Manual Retry** (`useRetryMessage`)

- Retry button muncul di message yang failed (❌)
- User bisa manual retry message yang gagal terkirim
- Klik icon 🔄 di sebelah status failed
- Message akan di-reset ke status "pending" dan otomatis di-sync
- Toast notification untuk feedback

### 5. **Optimistic UI Updates** (`useSendMessage`)

- Message langsung muncul di UI sebelum terkirim ke server
- Status indicator: ⏰ pending, 🔄 sending, ❌ failed (with retry button), ✅ sent
- Conversation list juga langsung terupdate

### 6. **Persistent Storage**

- **Conversations**: Tersimpan di `conversations-storage`
- **Messages**: Tersimpan di `chat-storage`
- **Offline Queue**: Tersimpan di `offline-queue-storage`
- Data tidak hilang meskipun refresh browser

## How It Works

### Sending Message (Online)

1. User ketik message dan klik send
2. Message langsung muncul di UI dengan status "sending"
3. Send via WebSocket
4. Jika sukses → status "sent", jika gagal → masuk queue

### Sending Message (Offline)

1. User ketik message dan klik send
2. Message langsung muncul di UI dengan status "pending"
3. Message masuk ke offline queue
4. Toast notification: "Offline - message will be sent when connection is restored"

### Auto-Sync (When Back Online)

1. Network status berubah dari offline → online
2. Delay 1 detik, kemudian trigger `syncQueue()`
3. Loop semua pending messages di queue
4. Send satu-persatu dengan delay 500ms
5. Update status: pending → sending → sent/failed
6. Jika sukses: remove dari queue
7. Jika gagal dan retry < 3: re-queue dengan retry count +1
8. Jika gagal dan retry >= 3: mark as "failed"

### Retrying Failed Messages (Manual)

1. Message dengan status "failed" menampilkan retry button (🔄)
2. User klik retry button di sebelah icon failed (❌)
3. Message status di-reset ke "pending" dengan retry count 0
4. Auto-sync akan pick up message dan coba kirim ulang
5. Toast notification: "Retrying to send message..."
6. Jika offline saat retry: Toast "You're offline. Message will retry automatically when back online."

## UI Indicators

### Message Status Icons

- ⏰ **Clock** (yellow): Pending - waiting to send
- 🔄 **Spinner** (blue): Sending - in progress
- ❌ **Alert** (red): Failed - max retries reached (with retry button)
- 🔄 **RefreshCw** (red): Retry button - click to resend failed message
- ✅ **Single Check** (gray): Delivered
- ✅✅ **Double Check** (blue): Read

### Network Badge

- 🔴 **"Offline"** badge muncul di MessageInput ketika offline

## Files Modified/Created

### New Files

- `store/useOfflineQueueStore.ts` - Queue management with retry function
- `hooks/useNetworkStatus.ts` - Network detection
- `hooks/useOfflineSync.ts` - Auto-sync logic
- `hooks/useSendMessage.ts` - Message sending wrapper
- `hooks/useRetryMessage.ts` - Manual retry handler
- `components/OfflineManager.tsx` - Global offline manager
- `types/message.d.ts` - Message type definition

### Modified Files

- `components/chat/MessageInput.tsx` - Add offline support
- `components/chat/MessageBubble.tsx` - Add status indicators
- `services/v1/messageService.tsx` - Add sendMessage function
- `app/layout.tsx` - Add OfflineManager component

## Storage Keys in LocalStorage

```javascript
{
  "offline-queue-storage": {
    "queue": [/* pending messages */]
  },
  "conversations-storage": {
    "conversations": [/* all conversations */]
  },
  "chat-storage": {
    "messages": { "conversationId": [/* messages */] },
    "conversations": { "conversationId": /* details */ },
    "members": { "conversationId": [/* members */] }
  }
}
```

## Testing

### Test Offline Mode

1. Open DevTools → Network tab
2. Set throttling to "Offline"
3. Send a message
4. Message should appear with ⏰ icon
5. Check localStorage `offline-queue-storage`
6. Set back to "Online"
7. Message should auto-sync and ⏰ → 🔄 → ✅

### Test Backend Down

1. Stop backend server (Ctrl+C di terminal air)
2. Send a message
3. Message queued with "pending" status
4. Start backend server again
5. Wait 1-2 seconds
6. Message should auto-send

### Test Failed Message

1. Send message to invalid conversation_id
2. Message akan retry 3x
3. Setelah 3x gagal, status jadi "failed" (❌ icon)
4. Message tetap ada di queue untuk manual retry later

## Benefits

✅ **Better UX**: User tidak perlu wait/retry manual  
✅ **No Data Loss**: Messages tersimpan di localStorage  
✅ **Seamless Sync**: Auto-sync ketika online  
✅ **Visual Feedback**: Clear status indicators  
✅ **Conversation Preserved**: List percakapan tidak hilang  
✅ **Multi-device Safe**: Each device punya queue sendiri

## Future Improvements

- [ ] Manual retry button untuk failed messages
- [ ] Batch sync untuk better performance
- [ ] Conflict resolution untuk concurrent edits
- [ ] IndexedDB untuk large data storage
- [ ] Service Worker untuk background sync
