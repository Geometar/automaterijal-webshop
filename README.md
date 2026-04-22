# AutomaterijalWebErp

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.10.

## Project notes

Frontend mrtav lager V1 surfaces currently include:

- admin entry in navigation for `/admin/dead-stock`
- admin-only marker in shared product row/card/detail surfaces
- `/admin/dead-stock` as a regular filtered webshop browse for admins only
- technical compatibility route `/webshop/akcije-rasprodaja` that is not promoted in customer UI

For business rules and backend/FE contract, use backend docs:

- `../automaterijal/docs/30-dead-stock.md`
- `../automaterijal/docs/40-brand-content.md`

## Brand content architecture

Brand rollout u ovom frontendu ima tri obavezna dela:

1. dodaj entry u `public/config/webshop-config.json`
2. dodaj content fajl u `public/brands/<slug>.json`
3. dodaj assete u `public/images/brands/`

Pravila:

- `id` u config-u mora da odgovara realnom manufacturer `proid` iz backend-a
- `slug` mora biti usklađen između frontend config-a, `public/brands/<slug>.json` i backend sitemap liste
- `/brendovi/<slug>` je SEO / content ruta
- `/webshop/manufacturers/<slug>` je kanonska manufacturer ruta i mora biti usklađena sa backend slug rezolucijom iz baze

Ako brend dobija detail landing stranu, obavezno dopuni i backend `SitemapService.BRAND_DETAIL_SLUGS`.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
