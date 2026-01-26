# Real-time Conversation Update Implementation

## Masalah yang Diselesaikan

Sebelumnya, ketika user A memulai percakapan baru dan mengirim pesan pertama kali, user B (penerima) tidak melihat conversation muncul di sidebar secara otomatis. User B harus melakukan reload halaman untuk melihat conversation baru tersebut.

## Solusi yang Diimplementasikan

### 1. Update Store - `useConversationsStore.ts`

Menambahkan method baru untuk menangani conversation yang baru masuk:

#### Method Baru: `addNewConversation`

- Menambahkan conversation baru ke list tanpa duplikasi
- Menempatkan conversation baru di bagian atas list
- Hanya menambahkan jika conversation belum ada dalam list

#### Update Method: `setMessage`

- Menambahkan validasi untuk memeriksa apakah conversation sudah ada
- Jika conversation tidak ada, menampilkan warning dan tidak melakukan update
- Mencegah error saat mencoba update conversation yang belum ada

### 2. Update Service - `conversationService.tsx`

Menambahkan fungsi untuk fetch detail conversation:

```typescript
export async function getConversationById(
  conversationId: string,
  userId: string
): Promise<any | null>;
```

Fungsi ini digunakan untuk mengambil detail lengkap conversation baru dari backend.

### 3. Update WebSocket Hook - `useGlobalMessageSocket.ts`

#### Fitur Baru:

1. **Auto-detect Conversation Baru**

   - Memeriksa apakah conversation sudah ada dalam list
   - Jika belum ada, otomatis fetch detail conversation dari API

2. **Prevent Duplicate Fetches**

   - Menggunakan `fetchingConversations` ref untuk melacak conversation yang sedang di-fetch
   - Mencegah multiple API calls untuk conversation yang sama

3. **Auto-add ke Sidebar**

   - Setelah fetch berhasil, otomatis menambahkan conversation ke sidebar
   - Set unread_count = 1 untuk message baru
   - Menampilkan display_name dan display_avatar dengan benar

4. **Toast Notification**
   - Menampilkan notifikasi saat ada conversation baru
   - Menampilkan nama pengirim yang memulai conversation

## Flow Kerja

### Scenario: User A mengirim pesan pertama ke User B

1. **User A** mengirim pesan melalui WebSocket
2. **Backend** menerima dan menyimpan pesan
3. **Backend** mengirim pesan ke **User B** melalui WebSocket connection mereka
4. **User B's WebSocket handler** (`useGlobalMessageSocket`) menerima pesan:

   - ✅ Memeriksa apakah conversation sudah ada di list
   - ❌ Conversation tidak ditemukan (conversation baru)
   - 🔄 Fetch detail conversation dari API: `getConversationById()`
   - 📥 Menerima data conversation lengkap termasuk display_name & display_avatar
   - ➕ Membuat object `RecentConversation` dengan struktur yang benar
   - 📝 Memanggil `addNewConversation()` untuk menambahkan ke store
   - 🔔 Menampilkan toast notification
   - ✅ Conversation muncul di sidebar dengan unread counter = 1

5. **User B** melihat conversation baru di sidebar tanpa reload!

## Struktur Data

### RecentConversation Object

```typescript
{
  Conversation: {
    id: string,
    name: string,
    avatar_url: string,
    is_group: boolean,
    is_cross_tenant: boolean,
    created_by: string,
    created_at: string,
    updated_at: string,
    members: any,
    messages: any,
    display_name: string,      // Untuk menampilkan nama yang tepat
    display_avatar: string,     // Untuk menampilkan avatar yang tepat
    unread_count: number        // Counter pesan yang belum dibaca
  },
  LastMessage: Message
}
```

## Testing

### Test Case 1: Conversation Baru

1. Login sebagai User A
2. Mulai conversation baru dengan User B
3. Kirim pesan pertama
4. **Expected**: User B melihat conversation muncul di sidebar dengan unread counter = 1

### Test Case 2: Message Lanjutan

1. Conversation sudah ada di kedua user
2. User A kirim pesan baru
3. **Expected**: User B melihat last message terupdate dan unread counter bertambah

### Test Case 3: Multiple New Conversations

1. User A mulai conversation dengan User B
2. User C mulai conversation dengan User B (hampir bersamaan)
3. **Expected**: Kedua conversation muncul di sidebar User B tanpa duplikasi

## Files Modified

1. ✅ `store/useConversationsStore.ts`

   - Added `addNewConversation` method
   - Updated `setMessage` with validation

2. ✅ `services/v1/conversationService.tsx`

   - Added `getConversationById` function

3. ✅ `hooks/useGlobalMessageSocket.ts`
   - Added auto-detection for new conversations
   - Added API fetch for conversation details
   - Added duplicate fetch prevention
   - Added toast notification

## Catatan Penting

### API Requirement

Backend API endpoint `/conversations/:conversationId?user_id=xxx` harus mengembalikan:

```json
{
  "status": true,
  "data": {
    "Conversation": { ... },
    "display_name": "...",
    "display_avatar": "...",
    "Members": [ ... ]
  }
}
```

### Performance

- Fetch hanya dilakukan untuk conversation yang belum ada
- Duplicate fetch dicegah dengan tracking ref
- WebSocket tetap lightweight dan efisien

### Error Handling

- Jika fetch gagal, error di-log ke console
- User tetap bisa reload untuk melihat conversation
- WebSocket tetap berjalan normal

## Future Improvements

1. **Optimistic Update**: Tampilkan conversation sementara saat fetch API
2. **Retry Logic**: Auto-retry jika fetch conversation gagal
3. **Batch Fetch**: Jika ada multiple conversation baru, fetch sekaligus
4. **Cache**: Cache conversation data untuk mengurangi API calls
