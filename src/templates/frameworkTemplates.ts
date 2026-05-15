/**
 * Framework-specific AGENTS.md templates library.
 * Curated templates with real tribal knowledge for 15+ popular frameworks.
 * These templates contain SPECIFIC, NON-INFERABLE information that actually helps AI agents.
 */

export interface FrameworkTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  content: string;
}

export const FRAMEWORK_TEMPLATES: FrameworkTemplate[] = [
  // ─── JavaScript / TypeScript ────────────────────────────
  {
    id: 'nextjs',
    name: 'Next.js (App Router)',
    description: 'Next.js 14/15 with App Router, Server Components, and Server Actions',
    tags: ['react', 'nextjs', 'typescript', 'fullstack', 'ssr'],
    content: `# AGENTS.md

> Instructions for AI coding agents working on this project.

## Project Overview

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Package Manager:** npm / pnpm

## Commands

- **Dev:** \`npm run dev\` (starts at http://localhost:3000)
- **Build:** \`npm run build\`
- **Lint:** \`npm run lint\`

## Architecture Decisions

- We use **App Router** (not Pages Router). All routes are in \`app/\` directory.
- Server Components are the default. Only add \`"use client"\` when you need interactivity.
- Server Actions replace traditional API routes for mutations.
- We use \`next/image\` for all images — never use raw \`<img>\` tags.

## Gotchas & Known Issues

- \`"use client"\` must be the FIRST line in client component files, before any imports.
- Do NOT import server-only modules (like \`fs\`, database clients) in client components.
- \`cookies()\` and \`headers()\` make a route dynamic — avoid in static pages.
- Middleware runs on Edge Runtime — no Node.js APIs like \`fs\` or \`path\`.
- \`revalidatePath()\` only works in Server Actions and Route Handlers.
- \`metadata\` export only works in Server Components (layout.tsx, page.tsx).
- Next.js caches aggressively — use \`revalidateTag()\` or \`revalidatePath()\` to bust cache.

## Key Structure

\`\`\`
app/                    # Routes (App Router)
  layout.tsx            # Root layout (wraps all pages)
  page.tsx              # Homepage
  [slug]/page.tsx       # Dynamic routes
  api/                  # API Route Handlers
components/             # Shared React components
lib/                    # Utilities, database, auth
public/                 # Static assets
\`\`\`

## Conventions

- File naming: \`kebab-case.tsx\` for components, \`camelCase.ts\` for utilities
- All API responses use \`NextResponse.json()\`
- Use \`notFound()\` from \`next/navigation\` for 404s (never throw errors)
- Loading states go in \`loading.tsx\`, error boundaries in \`error.tsx\`

## Rules

### Do Not
- Do not use Pages Router patterns (\`getServerSideProps\`, \`getStaticProps\`)
- Do not use \`useEffect\` for data fetching — use Server Components or SWR
- Do not put secrets in \`NEXT_PUBLIC_\` env vars (they are exposed to browser)
- Do not modify \`next.config.js\` without explicit instruction

### Performance
- Use \`Suspense\` boundaries for streaming
- Prefer \`generateStaticParams\` for static generation of dynamic routes
- Use \`loading.tsx\` files for route-level loading states`,
  },
  {
    id: 'react-vite',
    name: 'React + Vite',
    description: 'React SPA with Vite bundler, React Router, and modern tooling',
    tags: ['react', 'vite', 'typescript', 'spa', 'frontend'],
    content: `# AGENTS.md

> Instructions for AI coding agents working on this project.

## Project Overview

- **Framework:** React + Vite
- **Language:** TypeScript
- **Styling:** CSS Modules / Tailwind CSS
- **Package Manager:** npm

## Commands

- **Dev:** \`npm run dev\` (starts at http://localhost:5173)
- **Build:** \`npm run build\`
- **Preview:** \`npm run preview\`

## Architecture Decisions

- This is a **Single Page Application** (SPA), not SSR.
- We use React Router for client-side routing.
- State management: React Context + useReducer (no Redux unless explicitly needed).
- API calls go through \`src/api/\` module — never call fetch directly in components.

## Gotchas & Known Issues

- Vite uses \`import.meta.env\` NOT \`process.env\` for environment variables.
- Only env vars prefixed with \`VITE_\` are exposed to the browser.
- \`.env.local\` is gitignored by default — use \`.env.example\` for documentation.
- Hot Module Replacement (HMR) breaks if you export non-component values from .tsx files.
- Vite requires explicit file extensions in some import paths.

## Key Structure

\`\`\`
src/
  components/       # Reusable UI components
  pages/            # Route-level components
  hooks/            # Custom React hooks
  api/              # API client and endpoints
  utils/            # Helper functions
  types/            # TypeScript type definitions
  assets/           # Images, fonts, etc.
\`\`\`

## Conventions

- Components: PascalCase (\`UserCard.tsx\`)
- Hooks: \`useXxx.ts\` pattern
- One component per file
- Props interface named \`XxxProps\`

## Rules

### Do Not
- Do not use \`process.env\` — use \`import.meta.env\`
- Do not install heavy libraries without discussion
- Do not put API keys in frontend code`,
  },
  {
    id: 'vue-nuxt',
    name: 'Vue / Nuxt.js',
    description: 'Vue 3 or Nuxt 3 with Composition API and auto-imports',
    tags: ['vue', 'nuxt', 'typescript', 'ssr', 'fullstack'],
    content: `# AGENTS.md

> Instructions for AI coding agents working on this project.

## Project Overview

- **Framework:** Nuxt 3 / Vue 3
- **Language:** TypeScript
- **Styling:** Tailwind CSS / UnoCSS

## Commands

- **Dev:** \`npm run dev\`
- **Build:** \`npm run build\`
- **Generate:** \`npm run generate\` (static site generation)

## Gotchas & Known Issues

- Nuxt 3 **auto-imports** Vue APIs (ref, computed, watch) — do NOT manually import them.
- Nuxt 3 auto-imports components from \`components/\` — no need for import statements.
- \`useFetch\` and \`useAsyncData\` only work in \`setup()\` or \`<script setup>\` context.
- \`useState\` is Nuxt's SSR-safe alternative to \`ref\` for shared state — not React's useState.
- Server-only code goes in \`server/\` directory — it's never sent to the client.
- \`definePageMeta\` must be called at the top level of \`<script setup>\`, not inside functions.

## Key Structure

\`\`\`
pages/              # File-based routing
components/         # Auto-imported components
composables/        # Auto-imported composables (useXxx)
server/             # Server-only code (API routes, middleware)
  api/              # Server API routes
layouts/            # Page layouts
middleware/         # Route middleware
plugins/            # Nuxt plugins
\`\`\`

## Conventions

- Use Composition API with \`<script setup>\` (never Options API)
- Composables: \`useXxx.ts\` in \`composables/\`
- API routes: \`server/api/[name].ts\``,
  },
  // ─── Backend Frameworks ────────────────────────────
  {
    id: 'express',
    name: 'Express.js / Node.js API',
    description: 'Express.js REST API with middleware pattern',
    tags: ['express', 'nodejs', 'api', 'backend', 'rest'],
    content: `# AGENTS.md

> Instructions for AI coding agents working on this project.

## Project Overview

- **Framework:** Express.js
- **Language:** TypeScript / JavaScript
- **Database:** PostgreSQL / MongoDB
- **Package Manager:** npm

## Commands

- **Dev:** \`npm run dev\`
- **Build:** \`npm run build\`
- **Test:** \`npm test\`

## Gotchas & Known Issues

- Middleware order matters — auth middleware must come BEFORE route handlers.
- Always call \`next()\` in middleware or the request will hang forever.
- Error-handling middleware must have exactly 4 parameters: \`(err, req, res, next)\`.
- \`async\` route handlers need \`try/catch\` or \`express-async-errors\` — unhandled rejections crash the server.
- \`req.body\` is undefined without \`express.json()\` middleware.

## Key Structure

\`\`\`
src/
  routes/           # Route definitions
  controllers/      # Request handlers
  middleware/       # Auth, validation, error handling
  services/        # Business logic
  models/          # Database models
  utils/           # Helper functions
  config/          # App configuration
\`\`\`

## Conventions

- Routes: \`/api/v1/[resource]\`
- Controllers: thin — delegate to services
- Services: contain all business logic
- Always return consistent JSON: \`{ success, data, error }\`
- Use HTTP status codes correctly (201 for create, 204 for delete)

## Rules

### Do Not
- Do not put business logic in controllers
- Do not use \`res.send()\` for API responses — use \`res.json()\`
- Do not remove auth middleware from protected routes`,
  },
  {
    id: 'nestjs',
    name: 'NestJS',
    description: 'NestJS with decorators, DI, modules, and TypeORM/Prisma',
    tags: ['nestjs', 'typescript', 'api', 'backend', 'enterprise'],
    content: `# AGENTS.md

> Instructions for AI coding agents working on this project.

## Project Overview

- **Framework:** NestJS
- **Language:** TypeScript (strict)
- **ORM:** Prisma / TypeORM

## Commands

- **Dev:** \`npm run start:dev\`
- **Build:** \`npm run build\`
- **Test:** \`npm run test\`
- **E2E:** \`npm run test:e2e\`

## Gotchas & Known Issues

- Every service/controller MUST be registered in a Module's \`providers\`/\`controllers\`.
- Circular dependencies crash silently — use \`forwardRef()\` to resolve them.
- Guards execute BEFORE interceptors and pipes — order: Guards → Interceptors → Pipes → Handler.
- \`@Injectable()\` decorator is required on ALL service classes.
- DTOs must use \`class-validator\` decorators AND \`ValidationPipe\` in main.ts.
- \`ConfigService.get()\` returns \`string | undefined\` — always provide a default.

## Conventions

- One module per feature (\`users/users.module.ts\`)
- DTOs: \`create-user.dto.ts\`, \`update-user.dto.ts\`
- Use \`@ApiTags()\` and \`@ApiOperation()\` for Swagger docs
- Global exception filter handles all unhandled errors`,
  },
  // ─── Python ────────────────────────────────────────
  {
    id: 'django',
    name: 'Django / Django REST',
    description: 'Django with DRF, models, views, and migrations',
    tags: ['django', 'python', 'api', 'backend', 'fullstack'],
    content: `# AGENTS.md

> Instructions for AI coding agents working on this project.

## Project Overview

- **Framework:** Django + Django REST Framework
- **Language:** Python 3.11+
- **Database:** PostgreSQL

## Commands

- **Dev:** \`python manage.py runserver\`
- **Migrate:** \`python manage.py makemigrations && python manage.py migrate\`
- **Test:** \`python manage.py test\`
- **Shell:** \`python manage.py shell\`

## Gotchas & Known Issues

- Always run \`makemigrations\` after changing models — Django won't auto-detect.
- Migration files are version-controlled — never delete them manually.
- \`ForeignKey\` requires \`on_delete\` parameter (usually \`CASCADE\` or \`PROTECT\`).
- \`@login_required\` redirects to LOGIN_URL — use \`@permission_classes\` for DRF.
- QuerySets are lazy — they don't hit the database until evaluated.
- \`select_related()\` for ForeignKey, \`prefetch_related()\` for ManyToMany.
- Never use \`Model.objects.all()\` in templates — creates N+1 queries.

## Key Structure

\`\`\`
project_name/
  settings.py         # Configuration (NEVER commit secrets here)
  urls.py             # Root URL configuration
app_name/
  models.py           # Database models
  views.py            # View functions / ViewSets
  serializers.py      # DRF serializers
  urls.py             # App-level URLs
  admin.py            # Admin configuration
  tests.py            # Tests
  migrations/         # Database migrations (auto-generated)
\`\`\``,
  },
  {
    id: 'fastapi',
    name: 'FastAPI',
    description: 'FastAPI with Pydantic, async/await, and SQLAlchemy',
    tags: ['fastapi', 'python', 'api', 'backend', 'async'],
    content: `# AGENTS.md

> Instructions for AI coding agents working on this project.

## Project Overview

- **Framework:** FastAPI
- **Language:** Python 3.11+
- **ORM:** SQLAlchemy / Tortoise ORM

## Commands

- **Dev:** \`uvicorn main:app --reload\`
- **Test:** \`pytest\`
- **Docs:** http://localhost:8000/docs (Swagger UI auto-generated)

## Gotchas & Known Issues

- Path parameters must match function parameter names exactly.
- \`Depends()\` creates a new instance per request — use \`yield\` for cleanup.
- Pydantic v2 uses \`model_validate()\` not \`from_orm()\` for ORM models.
- \`async def\` endpoints run in the event loop — blocking code freezes the server.
- Use \`BackgroundTasks\` for fire-and-forget work, not \`asyncio.create_task()\`.
- Response model fields must be JSON-serializable — datetime needs custom encoder.

## Conventions

- Routers: one file per resource (\`routers/users.py\`)
- Schemas: Pydantic models for request/response (\`schemas/user.py\`)
- CRUD: database operations in \`crud/\` module
- Dependencies: shared logic in \`dependencies.py\``,
  },
  // ─── PHP ───────────────────────────────────────────
  {
    id: 'laravel',
    name: 'Laravel',
    description: 'Laravel with Eloquent, Blade, and Artisan commands',
    tags: ['laravel', 'php', 'fullstack', 'backend', 'mvc'],
    content: `# AGENTS.md

> Instructions for AI coding agents working on this project.

## Project Overview

- **Framework:** Laravel
- **Language:** PHP 8.2+
- **Database:** MySQL / PostgreSQL

## Commands

- **Dev:** \`php artisan serve\`
- **Migrate:** \`php artisan migrate\`
- **Test:** \`php artisan test\`
- **Generate:** \`php artisan make:model ModelName -mcr\` (model + migration + controller + resource)

## Gotchas & Known Issues

- Always run \`composer dump-autoload\` after adding new classes manually.
- \`$fillable\` or \`$guarded\` MUST be set on models — mass assignment is blocked by default.
- Route model binding only works with \`{model}\` parameter name matching the variable name.
- \`php artisan config:cache\` caches config — env() calls outside config files will return null.
- Eloquent \`delete()\` fires events, \`DB::table()->delete()\` does NOT.
- Middleware order in \`Kernel.php\` matters — auth before API throttle.

## Key Structure

\`\`\`
app/
  Http/Controllers/   # Request handlers
  Models/             # Eloquent models
  Services/           # Business logic
routes/
  web.php             # Web routes (sessions, CSRF)
  api.php             # API routes (stateless)
database/
  migrations/         # Schema changes
  seeders/            # Test data
resources/views/      # Blade templates
\`\`\``,
  },
  // ─── Mobile ────────────────────────────────────────
  {
    id: 'react-native',
    name: 'React Native / Expo',
    description: 'React Native with Expo, navigation, and native modules',
    tags: ['react-native', 'expo', 'mobile', 'typescript', 'ios', 'android'],
    content: `# AGENTS.md

> Instructions for AI coding agents working on this project.

## Project Overview

- **Framework:** React Native / Expo
- **Language:** TypeScript
- **Navigation:** React Navigation

## Commands

- **Dev:** \`npx expo start\`
- **iOS:** \`npx expo run:ios\`
- **Android:** \`npx expo run:android\`

## Gotchas & Known Issues

- There is NO DOM — \`div\`, \`span\`, \`p\` don't exist. Use \`View\`, \`Text\`, \`Pressable\`.
- CSS doesn't exist — use \`StyleSheet.create()\` or NativeWind for Tailwind-like syntax.
- \`flexDirection\` defaults to \`column\` (not \`row\` like web).
- \`onClick\` doesn't exist — use \`onPress\` on \`Pressable\` or \`TouchableOpacity\`.
- Platform-specific code: \`Platform.OS === 'ios'\` or \`.ios.tsx\` / \`.android.tsx\` file extensions.
- Expo Go has limitations — some native modules require development builds.
- \`SafeAreaView\` is required to avoid content under the notch/status bar.

## Conventions

- Screens in \`screens/\` or \`app/\` (Expo Router)
- Components in \`components/\`
- Use \`expo-constants\` for env vars, not \`process.env\``,
  },
  // ─── Static / JAMstack ─────────────────────────────
  {
    id: 'html-css-js',
    name: 'HTML + CSS + JavaScript',
    description: 'Static website or vanilla JS app without frameworks',
    tags: ['html', 'css', 'javascript', 'static', 'vanilla', 'beginner'],
    content: `# AGENTS.md

> Instructions for AI coding agents working on this project.

## Project Overview

- **Type:** Static website / Vanilla JavaScript
- **Language:** HTML, CSS, JavaScript
- **No build tools** — files are served directly

## Architecture Decisions

- This project intentionally uses NO frameworks — keep it simple.
- All JavaScript is vanilla — no jQuery, React, or other libraries.
- CSS is vanilla — no Tailwind, SCSS, or CSS-in-JS.

## Gotchas & Known Issues

- No module bundler — use \`<script>\` tags in HTML, not \`import\` statements.
- If using ES modules, add \`type="module"\` to the script tag.
- CSS files must be linked in HTML \`<head>\` — they don't auto-load.
- \`fetch()\` requires a server for local files — use Live Server extension.
- No hot reload — refresh the browser manually or use Live Server.

## Key Structure

\`\`\`
index.html           # Main page
styles/              # CSS files
  style.css
scripts/             # JavaScript files
  app.js
assets/              # Images, fonts
  images/
  fonts/
\`\`\`

## Conventions

- Semantic HTML5 elements (\`header\`, \`main\`, \`section\`, \`footer\`)
- BEM naming for CSS (\`.block__element--modifier\`)
- All interactive elements must have \`id\` attributes
- Mobile-first responsive design
- Accessible: alt text on images, proper heading hierarchy`,
  },
  // ─── Fullstack / Meta ──────────────────────────────
  {
    id: 't3-stack',
    name: 'T3 Stack',
    description: 'Next.js + tRPC + Prisma + NextAuth + Tailwind (create-t3-app)',
    tags: ['t3', 'nextjs', 'trpc', 'prisma', 'typescript', 'fullstack'],
    content: `# AGENTS.md

> Instructions for AI coding agents working on this project.

## Project Overview

- **Stack:** T3 (Next.js + tRPC + Prisma + NextAuth + Tailwind)
- **Language:** TypeScript (strict)

## Commands

- **Dev:** \`npm run dev\`
- **DB Push:** \`npx prisma db push\`
- **DB Studio:** \`npx prisma studio\`
- **Generate:** \`npx prisma generate\` (after schema changes)

## Gotchas & Known Issues

- After changing \`schema.prisma\`, always run \`npx prisma generate\`.
- tRPC procedures are type-safe end-to-end — do NOT create separate API routes.
- \`useSession()\` requires \`SessionProvider\` wrapper in the layout.
- Prisma Client is singleton — import from \`src/server/db.ts\`, never create new instances.
- tRPC context has access to session — use \`protectedProcedure\` for auth-required endpoints.
- Tailwind classes: check \`tailwind.config.ts\` for custom theme values.

## Key Structure

\`\`\`
src/
  app/              # Next.js App Router
  server/
    api/            # tRPC routers
    db.ts           # Prisma client singleton
    auth.ts         # NextAuth configuration
  trpc/             # tRPC client setup
prisma/
  schema.prisma     # Database schema
\`\`\``,
  },
  {
    id: 'supabase',
    name: 'Supabase + Next.js',
    description: 'Next.js with Supabase for auth, database, and storage',
    tags: ['supabase', 'nextjs', 'postgres', 'auth', 'baas'],
    content: `# AGENTS.md

> Instructions for AI coding agents working on this project.

## Project Overview

- **Frontend:** Next.js (App Router)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Language:** TypeScript

## Commands

- **Dev:** \`npm run dev\`
- **Supabase Local:** \`npx supabase start\`
- **Types:** \`npx supabase gen types typescript --local > src/types/database.ts\`
- **Migration:** \`npx supabase migration new [name]\`

## Gotchas & Known Issues

- Use \`createServerClient()\` in Server Components, \`createBrowserClient()\` in Client Components.
- Row Level Security (RLS) is enabled by default — queries return empty without proper policies.
- Always regenerate types after changing database schema.
- \`supabase.auth.getSession()\` is deprecated on server — use \`supabase.auth.getUser()\`.
- Storage buckets need explicit policies for upload/download access.
- Realtime subscriptions require the table to have \`REPLICA IDENTITY FULL\` set.`,
  },
];

/**
 * Get all available templates.
 */
export function getAllTemplates(): FrameworkTemplate[] {
  return FRAMEWORK_TEMPLATES;
}

/**
 * Find template by ID.
 */
export function getTemplateById(id: string): FrameworkTemplate | undefined {
  return FRAMEWORK_TEMPLATES.find((t) => t.id === id);
}

/**
 * Search templates by query (matches name, description, tags).
 */
export function searchTemplates(query: string): FrameworkTemplate[] {
  const q = query.toLowerCase();
  return FRAMEWORK_TEMPLATES.filter((t) =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some((tag) => tag.includes(q))
  );
}

/**
 * Auto-detect the best template for a project based on its framework.
 */
export function detectBestTemplate(framework: string): FrameworkTemplate | undefined {
  const fwLower = framework.toLowerCase();

  const mapping: Record<string, string> = {
    'next.js': 'nextjs',
    'nextjs': 'nextjs',
    'react': 'react-vite',
    'react + vite': 'react-vite',
    'vue': 'vue-nuxt',
    'vue.js': 'vue-nuxt',
    'nuxt': 'vue-nuxt',
    'nuxt.js': 'vue-nuxt',
    'express': 'express',
    'express.js': 'express',
    'nestjs': 'nestjs',
    'nest.js': 'nestjs',
    'django': 'django',
    'fastapi': 'fastapi',
    'flask': 'fastapi', // Close enough
    'laravel': 'laravel',
    'react native': 'react-native',
    'expo': 'react-native',
    'html': 'html-css-js',
    'static': 'html-css-js',
    't3': 't3-stack',
    'supabase': 'supabase',
  };

  for (const [key, templateId] of Object.entries(mapping)) {
    if (fwLower.includes(key)) {
      return getTemplateById(templateId);
    }
  }

  return undefined;
}
