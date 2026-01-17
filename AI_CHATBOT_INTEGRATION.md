# AI Chatbot Integration

Dokumentasi integrasi AI Chatbot dengan NLP Service di duluin_chat_fe.

## 📁 File yang Ditambahkan

### 1. Service Layer

- **[services/nlpService.ts](services/nlpService.ts)** - Service untuk komunikasi dengan NLP Service API

### 2. UI Components

- **[app/conversation/ai-chatbot/page.tsx](app/conversation/ai-chatbot/page.tsx)** - Halaman conversation khusus untuk AI Chatbot
- **[components/chat/ConversationList.tsx](components/chat/ConversationList.tsx)** - Updated dengan entry AI Chatbot

### 3. Configuration

- **[.env.local](.env.local)** - Environment variable untuk NLP Service URL
- **[.env.example](.env.example)** - Updated dengan contoh config

## 🚀 Cara Menggunakan

### 1. Setup Environment

Pastikan file `.env.local` sudah ada dan berisi:

```env
NEXT_PUBLIC_NLP_SERVICE_URL=http://localhost:5000
```

### 2. Jalankan NLP Service

```bash
cd d:/laragon/www/duluin-nlp-service
uvicorn app.main:app --host 0.0.0.0 --port 5000
```

### 3. Jalankan Frontend

```bash
cd d:/laragon/www/duluin_chat_fe
npm run dev
```

### 4. Akses AI Chatbot

1. Buka aplikasi chat
2. Di sidebar, klik entry **"AI Assistant"** dengan icon bot
3. Atau akses langsung: `http://localhost:3000/conversation/ai-chatbot`

## ✨ Fitur

### AI Chatbot Entry di Sidebar

- **Visual Highlight**: Background gradient biru-purple
- **Badge "Bot"**: Menandakan ini adalah AI assistant
- **Always on Top**: Selalu muncul di paling atas conversation list
- **Online Indicator**: Dot hijau menunjukkan bot selalu ready

### Chat Interface

- **Real-time Response**: Chat dengan AI menggunakan NLP Service
- **Intent Detection**: Menampilkan intent yang terdeteksi di bawah pesan
- **Loading State**: Indikator "AI sedang berpikir..."
- **Error Handling**: Pesan error jika NLP Service tidak tersedia
- **Auto Scroll**: Otomatis scroll ke pesan terbaru
- **Keyboard Shortcut**:
  - Enter untuk kirim pesan
  - Shift+Enter untuk baris baru

### Supported Intents

Chatbot mendukung berbagai intent yang diproses oleh NLP Service:

- `greeting` - Sapaan
- `ask_how_are_you` - Tanya kabar
- `bot_identity` - Identitas bot
- `user_identity` - Identitas user (butuh auth token)
- `faq_capability` - Kemampuan bot
- `obrolan` - Chat bebas dengan LLM (Ollama)
- `tugas` - Manajemen task
- `pengeluaran` - Manajemen expense

## 🔧 Technical Details

### API Integration

```typescript
// Service call ke NLP
const response = await sendToNLP(
  text: string,
  userId: string,
  authorization?: string
);

// Response format
{
  success: boolean;
  intent: string;
  message: string;
  data?: any;
  state?: string;
}
```

### Authentication

- Menggunakan `auth_token` dari cookies untuk personalisasi
- `user_id` dari cookies untuk tracking conversation state
- Token dikirim sebagai `Authorization: Bearer <token>` header

### State Management

- Messages disimpan di local state (tidak persist)
- Setiap refresh page, conversation history reset
- Untuk production, bisa ditambahkan local storage persistence

## 🎨 Styling

### Colors

- Bot Avatar: Gradient biru ke purple (`from-blue-500 to-purple-600`)
- User Message: Biru solid (`bg-blue-600`)
- Bot Message: White dengan border (`bg-white border`)
- Sidebar Entry: Gradient background (`from-blue-50 to-purple-50`)

### Icons

- Bot icon dari `lucide-react`
- Online indicator: Green dot (`bg-green-500`)

## 📝 Contoh Usage

### User Chat Flow

```
User: "Halo"
Bot: "Halo! Ada yang bisa saya bantu?" [intent: greeting]

User: "Siapa kamu?"
Bot: "Saya adalah asisten virtual..." [intent: bot_identity]

User: "Jelaskan tentang AI"
Bot: [Response dari LLM Ollama] [intent: obrolan]
```

## 🐛 Troubleshooting

### Error: "Failed to connect to NLP Service"

- **Cause**: NLP Service tidak running atau URL salah
- **Solution**:
  1. Check apakah NLP Service running di port 5000
  2. Verify `NEXT_PUBLIC_NLP_SERVICE_URL` di `.env.local`
  3. Check network/firewall

### Error: "User ID not found"

- **Cause**: User belum login atau cookies cleared
- **Solution**: Login ulang ke aplikasi

### Bot tidak muncul di sidebar

- **Cause**: Frontend belum di-rebuild setelah update
- **Solution**: Restart dev server (`npm run dev`)

## 🔮 Future Improvements

1. **Conversation Persistence**

   - Save chat history ke local storage atau backend
   - Resume conversation setelah refresh

2. **Rich Message Types**

   - Support untuk card, buttons, quick replies
   - File upload untuk task/expense attachment

3. **Voice Input**

   - Speech-to-text untuk input
   - Text-to-speech untuk response

4. **Multi-language**

   - Support bahasa Indonesia dan Inggris
   - Language detection otomatis

5. **Analytics**
   - Track popular intents
   - User engagement metrics

## 📚 Related Documentation

- [NLP Service Routes](../duluin-nlp-service/README.md)
- [Postman Collection](../duluin-nlp-service/nlp-service.postman_collection.json)
- [Chat Workflow](CHAT_WORKFLOW_EXPLANATION.md)
