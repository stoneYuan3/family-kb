# Family Knowledge Base — Frontend (CLAUDE.md)

## Project Overview

A family wiki/knowledge base app for storing appliance manuals, warranties, insurance documents, and other household reference materials. Users upload photos or scans of documents, organize them into collections, and access them from any device on the home LAN.

This repo is the **Next.js frontend**. It connects to a separate Express backend API via REST.

### Developer Context

The developer is a front-end developer upleveling to full-stack. They are experienced with React and Next.js (from volunteer/hobby projects and some work projects using Next.js as a static frontend with headless Drupal). The backend was a learning exercise — this frontend phase should move faster since it's closer to their existing skillset. However, this is their first time wiring a frontend to their own custom API (as opposed to a CMS), so API integration patterns and auth token handling are newer territory.

---

## Architecture

### Two-Repo Setup

- **Frontend (this repo):** `family-kb-frontend` — Next.js 14+ with App Router, TypeScript, Tailwind CSS, shadcn/ui
- **Backend (separate repo):** `family-kb-api` — Express.js, Node.js, PostgreSQL (via `pg`), JWT auth, bcrypt, file uploads

The frontend and backend are fully separated. The frontend communicates with the backend exclusively through REST API calls. This separation was a deliberate architectural decision for portfolio value — it mirrors how production apps are built in the industry.

### Development Environment

- **Working laptop (Windows 11):** All coding happens here. PostgreSQL runs locally in a Docker container for development. The Next.js dev server runs here too.
- **Old laptop (Linux/Ubuntu, ThinkPad T470):** Acts as the "production" deployment server on the home LAN. Will host the full stack via Docker Compose in Phase 6.
- **Workflow:** Develop locally → push to GitHub → pull and deploy on Linux server later.

---

## Tech Stack (Frontend)

- **Next.js** with App Router (`src/` directory structure)
- **TypeScript**
- **Tailwind CSS** for styling
- **shadcn/ui** for UI components (components live in `src/components/ui/`)
- Installed shadcn components so far: `button`, `input`, `label`, `card`

### Key Dependencies

```
next
react
typescript
tailwindcss
@shadcn/ui components (source-copied into project)
```

---

## Backend API Reference

The Express backend runs on `http://localhost:3000` during development. The frontend dev server likely runs on `http://localhost:3001`. CORS is configured on the backend to allow requests from the frontend origin.

### Environment Variable

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Authentication

- JWT-based auth. Login returns a token containing `{ id, role }`.
- Token is sent as `Authorization: Bearer <token>` header on all authenticated requests.
- The frontend stores the token in memory (via a module-level variable in `src/lib/api.ts`).
- Auth is enforced on the backend — the frontend hides/shows UI elements for UX, but the API is the security boundary.

### Auth Endpoints

```
POST /api/auth/login
  Body: { email, password }
  Returns: { token, user: { id, name, email, role } }
```

Logout is frontend-only — just clear the stored token.

### User Roles

- **Admin** — can upload, edit, delete items; create/remove users; assign roles
- **Editor** — can upload, edit items
- **Viewer** — can only view

Role checking happens via backend middleware (`authenticate`, `adminOnly`, `selfOrAdmin`). The frontend should reflect these roles in the UI (e.g., hide admin-only buttons from editors/viewers).

### API Endpoints

#### Users
```
GET    /api/users              (auth required)
GET    /api/users/:id          (auth required)
POST   /api/users              (auth + admin only)
PUT    /api/users/:id          (auth + self or admin)
DELETE /api/users/:id          (auth + self or admin)
```

#### Collections
```
GET    /api/collections
GET    /api/collections/:id
POST   /api/collections
PUT    /api/collections/:id
DELETE /api/collections/:id
```

#### Items
```
GET    /api/items              (supports ?parent_collection=N query param for filtering)
GET    /api/items/:id
POST   /api/items
PUT    /api/items/:id
DELETE /api/items/:id
```

Items optionally belong to a collection via `parent_collection`. An item can exist standalone (no collection). The `owner_id` field is set automatically from the JWT token on the backend — the frontend does not send it.

#### Documents
```
GET    /api/items/:itemId/documents
POST   /api/items/:itemId/documents   (file upload via multipart/form-data)
DELETE /api/documents/:id
```

Documents always belong to an item. There is no update endpoint — documents are deleted and re-uploaded. There is no standalone document detail route since documents are only viewed within an item's context.

---

## Database Schema (for reference — managed by backend)

```sql
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');

-- users
id              INTEGER (auto-generated, GENERATED ALWAYS AS IDENTITY)
name            VARCHAR(255) NOT NULL UNIQUE
password        TEXT NOT NULL (bcrypt hashed)
avatar          TEXT (nullable)
email           VARCHAR(255) UNIQUE
phone           VARCHAR(20) UNIQUE
birthday        DATE (nullable)
role            user_role NOT NULL
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()

-- item
id              INTEGER (auto-generated)
owner_id        INTEGER (FK → users.id, ON DELETE SET NULL)
title           VARCHAR(255) NOT NULL
cover_image     TEXT (nullable)
description     TEXT (nullable)
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at      TIMESTAMPTZ (nullable)
parent_collection INTEGER (FK → item_collection.id, ON DELETE CASCADE, nullable)

-- document
id              INTEGER (auto-generated)
parent_item_id  INTEGER NOT NULL (FK → item.id, ON DELETE CASCADE)
file_url        TEXT NOT NULL
file_type       VARCHAR(50) NOT NULL
file_size       INTEGER NOT NULL

-- item_collection
id              INTEGER (auto-generated)
owner_id        INTEGER (FK → users.id, ON DELETE SET NULL)
title           VARCHAR(255) NOT NULL
parent_collection INTEGER (FK → self, ON DELETE CASCADE, nullable — supports nesting)
```

### Key Relationships

- User → Item: one-to-many (user creates items). If user is deleted, items remain (SET NULL on owner_id).
- Item → Document: one-to-many. If item is deleted, all documents cascade-delete.
- Item → Collection: optional. Items can exist standalone or belong to a collection. If collection is deleted, items inside cascade-delete.
- Collection → Collection: self-referencing for nested collections. Cascade-deletes children.
- Item must have at least 1 document — enforced in application code via database transactions (BEGIN → insert item → insert document(s) → COMMIT), not via database constraints.

---

## Frontend Project Structure

```
family-kb-frontend/
├── app/                      # Next.js App Router pages
│   ├── login/                # Login page
│   └── dashboard/            # Dashboard layout + nested pages
│       ├── files/            # Files listing + create form
│       └── users/            # Users listing
├── components/
│   └── ui/                   # shadcn/ui components (auto-generated)
├── lib/
│   ├── utils.ts              # shadcn utility (cn function)
│   ├── api.ts                # API client with auth token handling
│   └── auth.tsx              # Auth context/provider
├── types/
│   └── index.ts              # Shared TypeScript interfaces
├── .env.local                # NEXT_PUBLIC_API_URL
├── components.json           # shadcn/ui config
├── tsconfig.json
└── package.json
```

### API Client (`lib/api.ts`)

A reusable fetch wrapper that:
- Prepends `NEXT_PUBLIC_API_URL` to all endpoints
- Attaches JWT token as Bearer auth header when available
- Parses JSON responses and throws on non-OK status
- Exports `api.get<T>()`, `api.post<T>()`, `api.put<T>()`, `api.delete<T>()`, `api.upload<T>()` (for FormData/multipart)
- Exports `setToken()` and `getToken()` for auth state

### TypeScript Types (`types/index.ts`)

```ts
export type Role = "admin" | "editor" | "viewer";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  birthday?: string;
  role: Role;
  avatar?: string;
  created_at: string;
}

export interface Item {
  id: number;
  owner_id: number | null;
  title: string;
  cover_image?: string;
  description?: string;
  created_at: string;
  updated_at?: string;
  parent_collection?: number;
}

export interface Document {
  id: number;
  parent_item_id: number;
  file_url: string;
  file_type: string;
  file_size: number;
}

export interface Collection {
  id: number;
  owner_id: number | null;
  title: string;
  parent_collection?: number;
}
```

**Note:** These field names match the database column names from the SQL schema (`#ref/schema.sql`). If the API controllers transform any names in their JSON responses, update these interfaces accordingly.

---

## Recommended Build Order for Frontend Pages

1. **Login page** — connects to `POST /api/auth/login`, stores JWT token, redirects to main view
2. **Item listing page** — main "home" view, card-based layout of all items (`GET /api/items`)
3. **Item detail/viewer page** — shows documents (photos/PDFs) attached to an item (`GET /api/items/:id` + `GET /api/items/:itemId/documents`)
4. **Upload flow** — form for creating a new item with multi-file upload, connects to `POST /api/items` and `POST /api/items/:itemId/documents`
5. **Collections page** — list and manage collections
6. **User management** — admin-only page for managing users and roles

---

## User Flow Reference

### Upload Flow (primary use case)

User just bought a new appliance → takes a photo of the manual/warranty on their phone → opens the app in their phone browser → uploads photos → names the item, optionally sets a cover image and description, optionally assigns to a collection → done.

Alternative: user scans documents on a printer → gets on a computer → uploads scanned PDFs through the browser.

### Viewing Flow

User needs to check a manual → opens the app on phone or PC → browses or searches for the item → views the documents in-app.

---

## Development Phases (Full Project)

1. ✅ Infrastructure & Environment (Linux server, Docker, PostgreSQL)
2. ✅ Database Schema & Backend API (CRUD endpoints for all content types)
3. ✅ Authentication & Role-Based Access (JWT, bcrypt, middleware)
4. ✅ File Upload & Storage (backend file handling)
5. **→ Frontend (Next.js) ← WE ARE HERE**
6. LAN Deployment (Docker Compose on Linux server)
7. Future: Per-Item Permissions (database migration to add `is_restricted` + `item_allowed_users` allowlist table — see Permission Feature Plan doc)

---

## Deferred Features (Do Not Implement Yet)

- **Per-item access restrictions** — deferred until after core app works. Will involve a database migration adding `is_restricted` boolean to items and an `item_allowed_users` junction table. For now, all items are visible to all authenticated users. Only global role-based permissions (admin/editor/viewer) are active.
- **Full-text search** — mentioned in the project plan but not yet implemented on the backend.
- **Family contacts / service provider contacts** — nice-to-have, not in scope for initial build.
- **Government ID storage** — nice-to-have, not in scope.

---

## Coding Conventions

- Use TypeScript throughout — the developer chose this for portfolio value and to catch bugs early.
- Use Tailwind CSS utility classes for styling. shadcn/ui components are the base.
- Use the App Router pattern (not Pages Router).
- Keep API integration in `src/lib/api.ts` — don't scatter raw fetch calls across components.
- Auth checks happen on the backend. The frontend reflects roles for UX only.
- Use `NEXT_PUBLIC_API_URL` environment variable — never hardcode the backend URL.
- When adding new shadcn components: `npx shadcn@latest add <component-name>`

## UI Rules
- Always use shadcn/ui components for form elements, cards, dialogs, buttons, etc.
- Add new shadcn components via `npx shadcn@latest add <component-name>` — do not build custom versions of components shadcn already provides.
- shadcn components live in `src/components/ui/` — do not modify these directly unless customizing intentionally.
- Use Tailwind utility classes for layout and spacing. Do not write custom CSS.