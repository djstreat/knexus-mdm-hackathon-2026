<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Agent Guidelines for Knexus MDM Frontend

This document provides critical context about the tech stack and architectural preferences for this project.

## Core Tech Stack

### Next.js (App Router)

The project uses a very recent version of Next.js.

- **Use App Router exclusively.** Do not use the `pages/` directory.
- **Server Components by Default:** Prefer React Server Components (RSC). Use `'use client'` only when necessary for interactivity or browser APIs.
- **Data Fetching & Mutations:** Use standard `fetch` with Next.js caching mechanisms. Use **Server Actions** for all data mutations and form submissions.
- **Routing:** Utilize the App Router's file-based routing (layouts, loading, error, etc.).

### Tailwind CSS v4

- We use **Tailwind CSS v4**.
- Follow the latest v4 documentation for configuration and utility usage.

## UI & Design System

### Catalyst UI Kit

The project utilizes the **Catalyst UI kit** located in `src/components`.

- **Component Reuse:** Prioritize using existing components from `src/components` before building new ones.
- **Design Tokens:** Strictly adhere to the existing design system and design tokens (colors, spacing, typography) as implemented in the current component library. Do not introduce non-standard styles.

## Architecture & Data

### Local-First Approach

A primary architectural goal is a local-first experience.

- **Prefer Local Data:** Use local storage and the existing SQLite setup for data persistence whenever possible.
- **Minimize Cloud Dependencies:** Avoid introducing external cloud services (e.g., Firebase, Supabase) unless it is essential for a specific requirement that cannot be met locally.
