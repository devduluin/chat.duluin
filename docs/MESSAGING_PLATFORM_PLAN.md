# Duluin Chat Web — Messaging Platform (Unified)

**Branch:** `feature/messaging-platform`  
**Gabungan dari:** `feature/e2ee-messaging`, `feature/message-relay-retention`, `feature/message-pagination`

---

## Ringkasan Fitur

| Fitur | Modul utama |
|-------|-------------|
| E2EE | `lib/e2ee/*`, `hooks/useE2EEInit.ts`, `services/v1/e2eeService.ts` |
| Relay archive | `lib/message-archive.ts` (IndexedDB `duluin-chat-archive`) |
| Pagination | `hooks/useMessages.ts`, `components/chat/MessageList.tsx` |
| Call signaling | `lib/callSignaling.ts`, `store/useCallStore.ts`, `IncomingCallOverlay` |
| WS refactor | `lib/ws/*`, `hooks/useGlobalMessageSocket.ts` |

Spec backend: lihat `duluin-chat-be/docs/MESSAGING_PLATFORM_PLAN.md`.

---

## Alur Buka Percakapan

1. `GET /conversations/:id?limit=100` — halaman pertama dari server buffer
2. `archiveGetByConversation()` — muat arsip lokal (pesan pasca-purge)
3. `mergeArchiveWithServer()` — gabung + dedupe, preserve E2EE plaintext
4. Render di `MessageList`

## Alur Muat Pesan Lama

1. Tombol "Muat chat lainnya" jika `messagePagination.hasMore`
2. `GET /conversations/:id/messages?before_id=` — cursor pagination
3. `prependMessages()` + scroll preservation

## Alur Pesan Masuk (WebSocket)

1. `lib/ws/handlers/chat/handleIncomingMessage.ts` — decrypt E2EE
2. `persistInboundRelayMessage()` — simpan ke IndexedDB
3. `sendDeliveredAck()` — WS `{ type: "delivered" }` ke server

---

## File Kunci

| File | Peran |
|------|-------|
| `hooks/useMessages.ts` | Fetch initial + loadOlder, merge archive + pagination |
| `lib/message-archive.ts` | IndexedDB CRUD, delivered ack |
| `lib/ws/handlers/chat/handleIncomingMessage.ts` | Inbound message + relay persist |
| `store/useChatStore.ts` | `prependMessages`, `messagePagination`, archive on upsert |

---

## Testing Checklist

- [ ] DM plain: buka chat, load more, kirim/terima
- [ ] E2EE DM: enable encrypted chat, kirim/terima, reload page
- [ ] Grup: delivery/read receipt
- [ ] AI Assistant: tidak masuk archive, tidak kirim delivered
- [ ] Pesan pasca-purge server: masih tampil dari IndexedDB
- [ ] Incoming call overlay tidak ganggu message handler
- [ ] Clear/delete chat: IndexedDB ikut terhapus

## Gap fixes (2026-07-05)

- [x] Archive pesan dari REST (`setMessages`, `prependMessages`)
- [x] Archive pada optimistic send (`addMessage`, `replaceOptimisticMessage`)
- [x] `archiveDeleteByConversation` saat clear chat
- [x] Delivered ack hanya pada pesan baru (bukan update)

---

## Branch Arsip

Branch lama **dipertahankan**:

- `feature/e2ee-messaging`
- `feature/message-relay-retention`
- `feature/message-pagination`
