# Getting Started with RepoLens AI

## Bạn cần gì?

- **Node.js 18 trở lên** — Kiểm tra: `node -v`. Tải tại [nodejs.org](https://nodejs.org)
- **npm** (đi kèm Node.js)

## Cài đặt

```bash
# Cài đặt toàn cục — dùng được ở mọi project
npm install -g repolens-ai

# Kiểm tra thành công
repolens --version
# → 2.0.0
```

> **Tại sao dùng `npm install -g` mà không phải `npx`?**
>
> - `npm install -g` cài 1 lần, dùng mãi mãi. Giống cài ứng dụng trên máy.
> - `npx` chạy 1 lần rồi quên — mỗi lần chạy lại phải tải lại. Chậm và tốn mạng.
> - RepoLens AI là tool dùng thường xuyên → **`npm install -g` là cách đúng**.

## Bắt đầu nhanh (1 phút)

### Bước 1: Mở terminal ở thư mục project

```bash
cd đường-dẫn-tới-project-của-bạn
```

### Bước 2: Tạo AGENTS.md chất lượng

```bash
# Chế độ tự động (không cần trả lời câu hỏi)
repolens init -y

# Hoặc chế độ phỏng vấn (chất lượng cao hơn — trả lời 10 câu hỏi)
repolens init
```

### Bước 3: Chọn template cho framework của bạn

```bash
# Xem tất cả templates
repolens templates

# Áp dụng template (ví dụ: Next.js)
repolens templates --apply nextjs
```

**Templates có sẵn:** Next.js, React, Vue/Nuxt, Express, NestJS, Django, FastAPI, Laravel, React Native, HTML/CSS/JS, T3 Stack, Supabase.

### Bước 4: Đồng bộ cho mọi AI tool

```bash
repolens sync
```

Lệnh này tự động tạo:
- `CLAUDE.md` — Cho Claude Code / Codex
- `.cursorrules` — Cho Cursor IDE
- `.github/copilot-instructions.md` — Cho GitHub Copilot

### Bước 5: Tạo skill files

```bash
repolens skills --all
```

Tạo các file hướng dẫn trong `.cursor/skills/` giúp AI thực hiện đúng các task phức tạp (auth, database, deploy, debug, responsive UI).

### Bước 6: Xem dashboard

```bash
repolens dashboard
```

Mở trình duyệt tại `http://localhost:3141` để xem dashboard trực quan.

## Các lệnh thường dùng

| Lệnh | Mô tả | Khi nào dùng |
|---|---|---|
| `repolens init` | Tạo AGENTS.md | Bắt đầu project mới |
| `repolens lint` | Chấm điểm context files | Kiểm tra chất lượng |
| `repolens fix` | Auto-fix lỗi | Sau khi lint thấy điểm thấp |
| `repolens sync` | Đồng bộ 4 AI tools | Sau khi sửa AGENTS.md |
| `repolens templates` | Chọn template framework | Bắt đầu project mới |
| `repolens skills --all` | Tạo skill files | 1 lần cho mỗi project |
| `repolens doctor` | Health check | Kiểm tra setup |
| `repolens dashboard` | Dashboard trực quan | Khi muốn nhìn tổng thể |

## AI Enhancement (Tùy chọn)

RepoLens AI hoạt động **hoàn toàn offline** mà không cần API key. Nếu muốn AI phân tích sâu hơn:

```bash
# macOS / Linux
export OPENAI_API_KEY=your-key-here

# Windows CMD
set OPENAI_API_KEY=your-key-here

# Windows PowerShell
$env:OPENAI_API_KEY="your-key-here"

repolens analyze
```

## Tiếp theo

- Xem [commands.md](commands.md) cho tất cả 15 lệnh
- Xem [privacy.md](privacy.md) cho chính sách bảo mật
- Đọc README.md ở gốc repo cho overview đầy đủ
