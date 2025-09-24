# Copilot Instructions for automaterijal-web-erp

## Project Overview
This is an Angular 18 web application for an automotive parts webshop. The codebase is structured with Angular CLI conventions, but includes custom modules and configuration files for domain-specific features.

## Architecture & Key Components
- **src/app/**: Main application code. Organized into modules (e.g., `modules/webshop`), shared components, navigation, and footer.
- **public/config/**: Contains JSON config files (`categories-config.json`, `webshop-config.json`) that drive category and webshop settings. These are loaded at runtime and may affect UI/data flows.
- **public/images/**: Brand, group, icon, and other images. Used for UI branding and product categorization.
- **server.ts**: Entry point for server-side rendering (SSR) or custom server logic.
- **environment/**: Environment-specific settings for API endpoints and feature flags.

## Developer Workflows
- **Start Dev Server**: `npm start` or `ng serve` (see tasks.json). App runs at `http://localhost:4200/`.
- **Build**: `ng build` (artifacts in `dist/`).
- **Unit Tests**: `ng test` (uses Karma).
- **E2E Tests**: `ng e2e` (requires additional setup).
- **Generate Components/Services**: Use Angular CLI, e.g. `ng generate component <name>`.

## Project-Specific Patterns
- **Modules**: Features are grouped in `src/app/modules/`. Each module may have its own components, services, and styles.
- **Config-Driven UI**: Category and webshop behavior is controlled by JSON files in `public/config/`. Changes here may require code to reload or re-fetch config.
- **Image Organization**: Images are grouped by type (brands, groups, icons, etc.) for easy reference in UI components.
- **Environment Handling**: Use `environment.ts` and `environment.prod.ts` for switching API endpoints and feature flags.

## Integration Points
- **External APIs**: API endpoints are configured via environment files. Check `environment.ts` for details.
- **Font Assets**: Custom fonts are loaded from `public/fonts/`.
- **SSR/Server Logic**: If SSR is enabled, logic is in `server.ts` and `main.server.ts`.

## Conventions & Tips
- Prefer Angular CLI for generating code and running tasks.
- Keep config files in `public/config/` up to date with business requirements.
- Use feature modules for domain separation and maintainability.
- Reference images and fonts using relative paths from `public/`.
- Always check environment files before changing API-related code.

## Example: Adding a New Category
1. Update `public/config/categories-config.json` with the new category.
2. Add relevant images to `public/images/groups/`.
3. Update or create components in `src/app/modules/webshop/webshop-category/`.
4. Adjust routing in `app.routes.ts` if needed.

---
For more details, see `README.md` and Angular CLI documentation.
