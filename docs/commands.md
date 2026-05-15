# Commands Reference — RepoLens AI v2.0

## All 15 Commands

### 🎯 Context Management (8 commands)

| Command | Alias | Mô tả |
|---|---|---|
| `repolens init` | — | Tạo AGENTS.md bằng phỏng vấn + auto-detect |
| `repolens lint` | `score` | Chấm điểm context files (5 chiều, 0-100) |
| `repolens fix` | — | Auto-fix: xóa rules generic, dọn boilerplate |
| `repolens sync` | — | Đồng bộ AGENTS.md → CLAUDE.md → .cursorrules → Copilot |
| `repolens templates` | `tpl` | Browse & apply 12+ framework templates |
| `repolens skills` | — | Tạo .cursor/skills/ cho common tasks |
| `repolens doctor` | `check` | Health check AI dev setup |
| `repolens dashboard` | `ui` | Local web dashboard |

### 🔍 Analysis (7 commands)

| Command | Alias | Mô tả |
|---|---|---|
| `repolens analyze` | — | Phân tích toàn diện repo |
| `repolens architecture` | `arch` | Phân tích kiến trúc |
| `repolens explain <topic>` | — | Giải thích module (đọc code thực) |
| `repolens review` | — | Review changes gần đây |
| `repolens risks` | — | Quét bảo mật & maintainability |
| `repolens onboarding` | `onboard` | Onboarding guide |
| `repolens generate-agents` | `agents` | Tạo AGENTS.md (legacy — dùng `init`) |

---

## Chi Tiết Từng Command

### `repolens init`

Tạo AGENTS.md chất lượng cao bằng cách kết hợp auto-detect + phỏng vấn developer.

```bash
repolens init       # Interactive — trả lời 10 câu hỏi
repolens init -y    # Auto — không hỏi, dùng giá trị auto-detect
```

**Tính năng:**
- Auto-detect framework, language, architecture
- Đọc code thực (functions, classes, imports)
- Phỏng vấn gotchas, conventions, critical files
- Tự động merge framework template nếu có
- Backup file cũ trước khi ghi đè

### `repolens lint`

Chấm điểm context files trên 5 chiều.

```bash
repolens lint
```

**5 chiều đánh giá:**
| Chiều | Đo gì |
|---|---|
| Specificity | Rules cụ thể vs generic |
| Coverage | Có đủ sections quan trọng không |
| Conciseness | Không quá dài (AI struggles > 200 lines) |
| Freshness | Có reference file thật trong project |
| Tribal Knowledge | Thông tin AI không tự suy ra được |

**Phát hiện 14 anti-patterns:** "use descriptive names", "follow best practices", "write clean code"...

### `repolens fix`

Auto-fix lỗi trong context files.

```bash
repolens fix             # Fix và lưu (tạo backup)
repolens fix --dry-run   # Xem trước, không sửa
```

**Sửa gì:**
- Xóa rules generic (14 patterns)
- Xóa sections boilerplate (Coding Rules, Security Rules, Workflow Rules, Definition of Done)
- Dọn blank lines thừa
- Báo cáo score trước/sau

### `repolens sync`

Đồng bộ AGENTS.md sang tất cả AI tools.

```bash
repolens sync            # Sync (hỏi nếu có conflict)
repolens sync --force    # Ghi đè không hỏi
repolens sync --dry-run  # Xem kế hoạch, không sync
```

**Tạo:**
- `CLAUDE.md` — Cho Claude Code / Codex
- `.cursorrules` — Cho Cursor IDE
- `.github/copilot-instructions.md` — Cho GitHub Copilot

### `repolens templates`

Browse và apply templates cho framework phổ biến.

```bash
repolens templates                    # Xem tất cả (+ gợi ý cho project)
repolens templates --search react     # Tìm template
repolens templates --apply nextjs     # Áp dụng template
```

**12 templates:** Next.js, React+Vite, Vue/Nuxt, Express, NestJS, Django, FastAPI, Laravel, React Native, HTML/CSS/JS, T3 Stack, Supabase.

### `repolens skills`

Tạo skill files cho Cursor IDE.

```bash
repolens skills --list   # Xem danh sách skills
repolens skills --all    # Tạo tất cả skills phù hợp
```

**7 skills:** Create Page, Create API, Authentication, Database, Responsive UI, Deployment, Debugging.

### `repolens doctor`

Kiểm tra sức khỏe AI dev setup.

```bash
repolens doctor
```

**Kiểm tra 11 items:** AGENTS.md, CLAUDE.md, .cursorrules, Copilot instructions, Git, .gitignore, .env, README, tests, lint, sync status.

### `repolens dashboard`

Dashboard web local.

```bash
repolens dashboard              # Mở tại http://localhost:3141
repolens dashboard --port 8080  # Custom port
```

### `repolens analyze`

Phân tích toàn diện repository.

```bash
repolens analyze             # Terminal output
repolens analyze --format md # Xuất file markdown
repolens analyze --no-ai     # Không dùng AI
```

### `repolens explain <topic>`

Tìm và giải thích module bằng cách đọc code thực.

```bash
repolens explain auth        # Giải thích module auth
repolens explain payment     # Giải thích module payment
```

---

## Global Options

| Option | Mô tả |
|---|---|
| `--version`, `-V` | Hiển thị version |
| `--help`, `-h` | Hiển thị help |
| `--no-ai` | Tắt AI enhancement (analyze, arch, explain, review) |
