# Hướng Dẫn Sử Dụng RepoLens AI

RepoLens AI là công cụ CLI giúp bạn tạo, chấm điểm, đồng bộ và duy trì các tệp ngữ cảnh cho AI coding agents như Cursor, Claude Code, GitHub Copilot, OpenAI Codex, Windsurf và Antigravity.

Thông điệp ngắn gọn: AI coding agent chỉ làm việc tốt khi ngữ cảnh bạn đưa cho nó đủ tốt. RepoLens giúp biến những tệp hướng dẫn chung chung thành ngữ cảnh có giá trị thật cho từng dự án.

Tài liệu này bám theo RepoLens AI v3.1.1.

## Mục Lục

- [RepoLens AI Giải Quyết Vấn Đề Gì?](#repolens-ai-giải-quyết-vấn-đề-gì)
- [Ai Nên Dùng RepoLens?](#ai-nên-dùng-repolens)
- [Yêu Cầu Cài Đặt](#yêu-cầu-cài-đặt)
- [Bắt Đầu Nhanh Trong 5 Phút](#bắt-đầu-nhanh-trong-5-phút)
- [Các Tệp RepoLens Tạo Ra](#các-tệp-repolens-tạo-ra)
- [Workflow Khuyến Nghị Hằng Ngày](#workflow-khuyến-nghị-hằng-ngày)
- [Các Lệnh Quan Trọng](#các-lệnh-quan-trọng)
- [Cách Viết `AGENTS.md` Tốt](#cách-viết-agentsmd-tốt)
- [Gợi Ý Cho Dự Án Open-Source](#gợi-ý-cho-dự-án-open-source)
- [Quyền Riêng Tư Và Bảo Mật](#quyền-riêng-tư-và-bảo-mật)
- [Xử Lý Lỗi Thường Gặp](#xử-lý-lỗi-thường-gặp)
- [Checklist Triển Khai Cho Cộng Đồng](#checklist-triển-khai-cho-cộng-đồng)

## RepoLens AI Giải Quyết Vấn Đề Gì?

Khi làm việc với AI coding agent, nhiều dự án có các tệp như `AGENTS.md`, `CLAUDE.md`, `.cursorrules` hoặc `copilot-instructions.md`. Tuy nhiên, các tệp này thường gặp những vấn đề sau:

- Quá chung chung: "Follow best practices", "Do not commit secrets", "Write clean code".
- Bị lỗi thời sau vài lần refactor.
- Mỗi công cụ AI dùng một tệp riêng, dễ bị lệch nội dung.
- Thiếu "tribal knowledge": những điều chỉ team mới biết, như file nào nguy hiểm, lệnh nào dùng để test, module nào không nên sửa tùy tiện.
- Prompt đưa cho AI quá mơ hồ, khiến AI tạo code sai kiến trúc dự án.

RepoLens AI giúp bạn:

- Phân tích repo bằng static analysis và AST.
- Tạo `AGENTS.md` có nội dung riêng cho dự án.
- Đồng bộ một nguồn sự thật sang nhiều công cụ AI.
- Chấm điểm chất lượng ngữ cảnh từ 0 đến 100.
- Phát hiện ngữ cảnh bị drift so với code hiện tại.
- Tạo prompt có hiểu biết về repo.
- Kiểm tra nhanh code do AI vừa tạo trước khi commit.

## Ai Nên Dùng RepoLens?

RepoLens phù hợp với:

- Lập trình viên dùng Cursor, Claude Code, Codex, Copilot, Windsurf, Antigravity hoặc ChatGPT để code.
- Maintainer muốn cộng đồng đóng góp code dễ hơn.
- Team muốn thống nhất hướng dẫn cho nhiều AI coding tools.
- Dự án open-source muốn người mới hiểu nhanh cách repo vận hành.
- Người làm vibe coding nhưng vẫn muốn có guardrail để tránh nợ kỹ thuật.

## Yêu Cầu Cài Đặt

Bạn cần:

- Node.js từ phiên bản 18 trở lên.
- npm.
- Một dự án có Git repo là lý tưởng, vì một số lệnh sẽ đọc thay đổi trong Git.

Kiểm tra phiên bản Node:

```bash
node --version
```

Cài đặt toàn cục:

```bash
npm install -g repolens-ai
repolens --version
```

Hoặc chạy trực tiếp bằng `npx`:

```bash
npx repolens-ai --version
```

## Bắt Đầu Nhanh Trong 5 Phút

Đi vào thư mục dự án của bạn:

```bash
cd my-project
```

Chạy setup một lần:

```bash
repolens setup
```

Lệnh này sẽ:

1. Phân tích framework, kiến trúc và cấu trúc code.
2. Tạo hoặc cập nhật `AGENTS.md`.
3. Đồng bộ sang các tệp cho Cursor, Claude Code, GitHub Copilot, Codex và Windsurf.
4. Tạo skill files cho Cursor nếu phù hợp.
5. Chấm điểm chất lượng context.

Sau đó kiểm tra mức độ sẵn sàng của repo:

```bash
repolens vibe
```

Nếu bạn đang dùng `npx`, có thể chạy:

```bash
npx repolens-ai setup
npx repolens-ai vibe
```

## Các Tệp RepoLens Tạo Ra

`AGENTS.md` là nguồn sự thật chính. Từ tệp này, RepoLens có thể đồng bộ sang nhiều công cụ AI khác.

| Tệp | Công Cụ Sử Dụng | Vai Trò |
|---|---|---|
| `AGENTS.md` | Antigravity, Codex, nhiều AI agents | Nguồn sự thật chung cho repo |
| `.cursor/rules/project.mdc` | Cursor | Modern Cursor rule file |
| `.cursorrules` | Cursor legacy | Định dạng cũ của Cursor |
| `CLAUDE.md` | Claude Code | Hướng dẫn cho Claude khi làm việc trong repo |
| `.github/copilot-instructions.md` | GitHub Copilot | Hướng dẫn cho Copilot |
| `CODEX.md` | OpenAI Codex | Hướng dẫn cho Codex |
| `.windsurfrules` | Windsurf | Hướng dẫn cho Windsurf |

Quy tắc nên nhớ: sửa `AGENTS.md` trước, sau đó chạy `repolens sync`.

## Workflow Khuyến Nghị Hằng Ngày

### Ngày Đầu Tiên Trong Dự Án

```bash
repolens setup
repolens vibe
git add AGENTS.md CLAUDE.md CODEX.md .cursorrules .windsurfrules .cursor .github
git commit -m "docs: add AI context files"
```

Nếu dự án không dùng tất cả công cụ AI, bạn chỉ cần commit những tệp phù hợp với team.

### Mỗi Khi Mở Một AI Chat Mới

Dùng:

```bash
repolens context
```

Lệnh này tạo một bản tóm tắt ngắn gọn, dễ paste vào ChatGPT, Claude, Gemini, Antigravity hoặc bất kỳ AI chat nào. Nó gồm stack, kiến trúc, thư mục quan trọng, file cần cẩn thận, lệnh dev/test/build và các gotcha của dự án.

Nếu muốn copy thẳng vào clipboard:

```bash
repolens context --copy
```

### Khi Muốn Nhờ AI Làm Một Tính Năng

Thay vì prompt ngắn kiểu:

```text
add login
```

Hãy dùng:

```bash
repolens prompt "add login with email verification"
```

RepoLens sẽ tạo prompt có:

- Mục tiêu rõ ràng.
- Ngữ cảnh về repo hiện tại.
- Những file có khả năng liên quan.
- Guardrail riêng theo loại task.
- Kế hoạch kiểm tra sau khi sửa.

Nếu muốn copy prompt:

```bash
repolens prompt "add login with email verification" --copy
```

### Sau Khi AI Sửa Code

Chạy:

```bash
repolens check
```

Lệnh này kiểm tra nhanh các thay đổi AI vừa tạo, bao gồm:

- Thay đổi có rủi ro cao.
- TypeScript `any` không cần thiết.
- React file dùng hook nhưng thiếu `use client`.
- Debug log bị bỏ quên.
- Một số dấu hiệu code AI để lại trước khi commit.

`repolens check` không thay thế test suite, nhưng rất hữu ích như một lớp guardrail nhanh.

### Sau Khi Refactor Hoặc Đổi Cấu Trúc Dự Án

Cập nhật `AGENTS.md`, sau đó chạy:

```bash
repolens sync
repolens lint
```

Nếu `lint` báo ngữ cảnh bị cũ, hãy sửa `AGENTS.md` để phản ánh đúng repo hiện tại.

## Các Lệnh Quan Trọng

### `repolens setup`

Dùng cho lần thiết lập đầu tiên.

```bash
repolens setup
```

Tùy chọn:

```bash
repolens setup --no-sync
repolens setup --no-skills
```

Dùng `--no-sync` khi bạn chỉ muốn tạo `AGENTS.md` mà chưa muốn ghi sang các công cụ khác. Dùng `--no-skills` khi bạn không muốn tạo skill files cho Cursor.

### `repolens init`

Tạo `AGENTS.md` qua một phiên hỏi đáp tương tác.

```bash
repolens init
```

Dùng khi bạn muốn RepoLens hỏi về gotcha, quy ước, kiến trúc, file nguy hiểm và tri thức nội bộ của dự án.

Chế độ không tương tác:

```bash
repolens init -y
```

### `repolens context`

Tạo context ngắn gọn để paste vào AI chat.

```bash
repolens context
repolens context --copy
```

Nên dùng mỗi khi bắt đầu một cuộc trò chuyện mới với AI.

### `repolens prompt "<request>"`

Biến yêu cầu mơ hồ thành prompt có ngữ cảnh repo.

```bash
repolens prompt "add image upload to user profiles"
```

Nên dùng cho task có ảnh hưởng đến nhiều file, tính năng mới, refactor hoặc sửa bug khó.

### `repolens check`

Kiểm tra nhanh code do AI tạo.

```bash
repolens check
```

Nên chạy trước khi commit.

### `repolens vibe`

Chấm điểm repo về mức độ sẵn sàng cho AI-assisted coding và cộng đồng.

```bash
repolens vibe
```

Lệnh này xem xét:

- Chất lượng context.
- Mức độ bao phủ các công cụ AI.
- Workflow dev/build/lint/test.
- README, license, contribution docs.
- Tín hiệu rủi ro về code và kiến trúc.

### `repolens lint`

Chấm điểm chất lượng context từ 0 đến 100.

```bash
repolens lint
```

Xuất JSON:

```bash
repolens lint --json
```

Dùng trong CI:

```bash
repolens lint --ci --min-score 70
```

RepoLens đánh giá 5 nhóm:

| Nhóm Điểm | Ý Nghĩa |
|---|---|
| Specificity | Context có riêng cho dự án hay chỉ là lời khuyên chung |
| Coverage | Có bao phủ các phần quan trọng của repo không |
| Conciseness | Có quá dài và lãng phí token không |
| Freshness | Có nhắc đúng file và cấu trúc hiện tại không |
| Tribal Knowledge | Có chứa những điều AI không thể tự đoán ra không |

### `repolens sync`

Đồng bộ từ `AGENTS.md` sang các tệp AI tool khác.

```bash
repolens sync
```

Xem trước mà không ghi file:

```bash
repolens sync --dry-run
```

Ghi đè khi có sửa tay:

```bash
repolens sync --force
```

### `repolens fix`

Tự động sửa các rule quá chung chung làm giảm chất lượng context.

```bash
repolens fix
```

Xem trước thay đổi:

```bash
repolens fix --dry-run
```

Sau khi chạy `fix`, hãy đọc lại `AGENTS.md` để đảm bảo những nội dung quan trọng của team vẫn còn đầy đủ.

### `repolens dashboard`

Mở dashboard cục bộ để xem điểm và phân tích trực quan.

```bash
repolens dashboard
```

Mặc định dashboard chạy tại:

```text
http://localhost:3141
```

Đổi port:

```bash
repolens dashboard -p 8080
```

### `repolens doctor`

Kiểm tra sức khỏe setup AI trong repo.

```bash
repolens doctor
```

Lệnh này hữu ích khi bạn không chắc repo đã có đủ context files, sync đúng chưa, `.gitignore` ổn chưa, scripts có đầy đủ không.

### `repolens templates`

Xem và áp dụng template theo framework.

```bash
repolens templates
repolens templates --search react
repolens templates --apply nextjs
```

Nên dùng khi dự án thuộc framework phổ biến và bạn muốn bắt đầu từ một bộ rule có sẵn.

### `repolens skills`

Tạo `.cursor/skills/` cho các tác vụ phổ biến.

```bash
repolens skills --list
repolens skills --all
```

Phù hợp với team dùng Cursor và muốn có hướng dẫn riêng cho task như auth, database, deployment, debugging hoặc responsive UI.

## Các Lệnh Phân Tích Nâng Cao

| Lệnh | Khi Nào Dùng |
|---|---|
| `repolens analyze` | Cần phân tích tổng quan repo |
| `repolens arch` | Cần hiểu kiến trúc, module và phụ thuộc |
| `repolens explain <topic>` | Muốn RepoLens giải thích một module hoặc tính năng |
| `repolens review` | Muốn review nhanh thay đổi gần đây |
| `repolens risks` | Muốn quét rủi ro bảo mật và kiến trúc |
| `repolens onboard` | Muốn tạo guide onboarding cho developer mới |

Ví dụ:

```bash
repolens explain auth
repolens review
repolens risks
repolens onboard
```

## Cách Viết `AGENTS.md` Tốt

RepoLens có thể tạo file ban đầu, nhưng giá trị lớn nhất đến từ việc bạn bổ sung tri thức thật của dự án.

Nên ghi:

- Lệnh dùng để dev, test, lint, build.
- File nào là entry point.
- Module nào quan trọng và nên sửa cẩn thận.
- Những lỗi dễ gặp khi thay đổi code.
- Quyết định kiến trúc quan trọng.
- Quy ước riêng của team.
- Quy trình review và verify.
- Cách xử lý migration, env vars, seed data, job queue, cache.

Không nên ghi quá nhiều nội dung chung chung:

- "Write clean code."
- "Follow best practices."
- "Do not commit secrets."
- "Use meaningful names."
- "Add tests when needed."

AI đã biết các lời khuyên đó. Điều nó cần là thông tin riêng của repo.

Ví dụ kém hiệu quả:

```markdown
- Follow TypeScript best practices.
- Keep code clean.
- Do not break existing features.
```

Ví dụ tốt hơn:

```markdown
- All imports in `src/` must use `.js` extensions because the package is strict ESM.
- Do not add a shebang to `src/cli.ts`; tsup injects it through the banner config.
- Reporter output must go through `utils/logger.ts` because direct console output can break spinner rendering.
```

## Gợi Ý Cho Dự Án Open-Source

Nếu bạn đưa RepoLens ra cộng đồng, nên commit các tệp sau:

- `AGENTS.md`
- `CLAUDE.md`
- `CODEX.md`
- `.github/copilot-instructions.md`
- `.cursor/rules/project.mdc`
- `.cursorrules` nếu vẫn hỗ trợ Cursor legacy
- `.windsurfrules` nếu muốn hỗ trợ Windsurf
- `docs/` hoặc README có hướng dẫn dùng RepoLens

Nên thêm vào README một đoạn ngắn:

````markdown
## AI Coding Context

This repository uses RepoLens AI to keep AI coding context files accurate.

Recommended workflow:

```bash
repolens context
repolens prompt "describe your change"
repolens check
```

If you update architecture, commands, or important project conventions, update
`AGENTS.md` and run:

```bash
repolens sync
repolens lint
```
````

## Gợi Ý Cho Team

Với team nhiều người, nên có quy ước:

- `AGENTS.md` là nguồn sự thật.
- Mọi thay đổi về architecture, command, setup, folder structure phải cập nhật `AGENTS.md`.
- Chạy `repolens sync` sau khi sửa `AGENTS.md`.
- Chạy `repolens check` sau khi để AI sửa code.
- Đặt ngưỡng `repolens lint --ci --min-score 70` nếu muốn chặn context quá kém trong CI.

## Quyền Riêng Tư Và Bảo Mật

RepoLens được thiết kế offline-first:

- Mặc định chạy local trên máy của bạn.
- Không cần API key.
- Không upload toàn bộ source code.
- Không đọc nội dung `.env`.
- Mask secret trong output.
- AI enhancement là tùy chọn.

Nếu muốn bật AI enhancement, đặt `OPENAI_API_KEY`.

macOS/Linux:

```bash
export OPENAI_API_KEY="your-key"
```

Windows PowerShell:

```powershell
$env:OPENAI_API_KEY="your-key"
```

Sau đó chạy các lệnh có hỗ trợ AI:

```bash
repolens analyze
repolens arch
repolens explain auth
repolens review
```

Nếu muốn tắt AI enhancement:

```bash
repolens analyze --no-ai
repolens arch --no-ai
repolens explain auth --no-ai
repolens review --no-ai
```

## Xử Lý Lỗi Thường Gặp

### `repolens` không được nhận diện

Kiểm tra đã cài global chưa:

```bash
npm install -g repolens-ai
```

Hoặc dùng:

```bash
npx repolens-ai setup
```

### Node quá cũ

RepoLens cần Node.js 18 trở lên.

```bash
node --version
```

Nếu thấp hơn 18, hãy nâng cấp Node.

### Context score thấp

Thử các bước:

1. Chạy `repolens lint` để xem điểm nào thấp.
2. Chạy `repolens fix --dry-run` để xem các rule chung chung có thể bị loại bỏ.
3. Bổ sung gotcha, lệnh thật, file quan trọng và quy ước riêng vào `AGENTS.md`.
4. Chạy `repolens sync`.
5. Chạy lại `repolens lint`.

### Các file AI tool bị lệch nhau

Dùng:

```bash
repolens sync --dry-run
repolens sync
```

Nếu tệp đích có sửa tay và bạn chấp nhận ghi đè:

```bash
repolens sync --force
```

### Dashboard không mở được

Thử đổi port:

```bash
repolens dashboard -p 8080
```

Sau đó mở:

```text
http://localhost:8080
```

## Checklist Triển Khai Cho Cộng Đồng

Trước khi công bố RepoLens cho cộng đồng sử dụng trong dự án, hãy kiểm tra:

- Đã cài RepoLens và chạy `repolens setup`.
- `AGENTS.md` có thông tin riêng của repo, không chỉ là lời khuyên chung.
- Các lệnh dev, lint, test, build đúng với repo.
- Các gotcha quan trọng đã được ghi lại.
- Các file cho AI tools đã được sync.
- `repolens lint` đạt điểm chấp nhận được.
- `repolens vibe` không báo vấn đề nghiêm trọng.
- README có đoạn hướng dẫn workflow cho contributor dùng AI.
- Team biết cập nhật `AGENTS.md` khi kiến trúc hoặc workflow thay đổi.

## Workflow Mẫu Cho Contributor

Contributor có thể làm theo luồng này:

```bash
git clone <repo-url>
cd <repo>
npm install
repolens context
repolens prompt "describe the change you want to make"
```

Sau khi AI hỗ trợ sửa code:

```bash
repolens check
npm test
```

Nếu thay đổi ảnh hưởng đến kiến trúc, lệnh hoặc quy ước:

```bash
repolens sync
repolens lint
```

## Kết Luận

RepoLens AI không thay thế lập trình viên và cũng không thay thế AI coding agent. Nó là lớp ngữ cảnh và guardrail giữa hai bên: giúp AI hiểu repo tốt hơn, giúp con người kiểm soát thay đổi tốt hơn, và giúp cộng đồng đóng góp vào dự án dễ dàng hơn.

Nếu bạn chỉ nhớ ba lệnh, hãy nhớ:

```bash
repolens context
repolens prompt "what you want to build"
repolens check
```

Nếu bạn duy trì repo, hãy nhớ thêm:

```bash
repolens sync
repolens lint
repolens vibe
```
