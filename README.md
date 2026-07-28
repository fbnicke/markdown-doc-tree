# Markdown Doc Tree

Build interactive documentation trees and printable A4 manuals from the same directory of numbered Markdown files.

## Features

- Numbered Markdown hierarchy
- Validation with readable diagnostics
- Missing-parent warnings or strict validation
- Generated JSON manifest
- Interactive browser viewer
- Relative image support
- Printable A4 PDF generation
- Framework-independent output
- Cross-platform CLI for Linux and Windows

## Example

```text
docs/
├─ 1_Getting-Started.md
├─ 1.1_Installation.md
├─ 1.2_Configuration.md
├─ 2_Usage.md
├─ 2.1_Embedding.md
└─ images/
   └─ installation.png
```

These filenames produce:

```text
Getting Started
├─ Installation
└─ Configuration

Usage
└─ Embedding
```

## Installation

Clone the repository and install the dependencies:

```bash
npm install
npx playwright install chromium
```

## Quick start

Point the CLI at a directory of numbered Markdown files:

```bash
markdown-doc-tree serve ./docs
```

The command validates the documentation, generates a temporary manifest, starts a local viewer, and opens it in the default browser.

Generate a printable PDF from the same source directory:

```bash
markdown-doc-tree pdf ./docs \
  --output ./manual.pdf \
  --title "Documentation Manual"
```

PDF generation runs locally and requires the installed Playwright Chromium browser. Embedding the viewer in an application does not require Chromium.

## Development

Run the test suite:

```bash
npm test
```

Run the tests once:

```bash
npm run test:run
```

Build the TypeScript library:

```bash
npm run build
```

Start the documentation viewer:

```bash
npm run viewer:dev
```

Generate the documentation manifest:

```bash
npm run example:manifest
```

Generate the PDF manual:

```bash
npm run example:pdf
```

## CLI

Open a documentation directory in the local viewer:

```bash
markdown-doc-tree serve ./docs
```

Use another port or suppress automatic browser opening:

```bash
markdown-doc-tree serve ./docs --port 8080
markdown-doc-tree serve ./docs --no-open
```


Validate a documentation directory:

```bash
markdown-doc-tree validate ./docs
```

Treat missing parents as errors:

```bash
markdown-doc-tree validate ./docs --strict-missing-parents
```

Generate a manifest:

```bash
markdown-doc-tree manifest ./docs
```

Generate a PDF manual:

```bash
markdown-doc-tree pdf ./docs \
  --output ./dist/manual.pdf \
  --title "Customer Manual"
```

## Filename convention

```text
1_Chapter.md
1.1_Section.md
1.1.1_Subsection.md
```

The numeric prefix defines both ordering and hierarchy.

Markdown documents currently live directly inside the documentation root. Subdirectories are intended for images and other assets.

## Missing parents

Missing direct parents are warnings by default.

For example:

```text
2_Usage.md
2.1.1_Advanced.md
```

The document `2.1.1_Advanced.md` is attached to the nearest existing ancestor.

Strict validation rejects this structure:

```bash
markdown-doc-tree validate ./docs --strict-missing-parents
```

## Generated manifest

The manifest is a small JSON index used by the browser viewer.

Example:

```json
{
  "version": 1,
  "documents": [
    {
      "id": "1",
      "title": "Getting Started",
      "contentPath": "content/1_Getting-Started.md"
    }
  ],
  "tree": [
    {
      "id": "1",
      "children": []
    }
  ]
}
```

The generated output keeps the original speaking filenames and preserves the documentation asset structure.

## Viewer

The viewer loads the generated manifest, renders the documentation tree, and fetches Markdown documents on demand.

Navigation uses URL hashes:

```text
http://localhost:5173/#1.1
```

Relative links and images are resolved from the source Markdown file location.

> Documentation sources are assumed to be trusted. Raw HTML contained in Markdown is rendered by the viewer.

## Embedding the viewer

Install the package and import the viewer entry point once in the consuming application:

```ts
import "markdown-doc-tree/viewer";
```

Then add the Web Component:

```html
<markdown-doc-tree
  manifest-url="/docs/docs-manifest.json"
  navigation-mode="internal"
  initial-document="1"
></markdown-doc-tree>
```

The viewer supports the following attributes:

| Attribute          | Description                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `manifest-url`     | URL of the generated documentation manifest. Defaults to `/docs-manifest.json`.                                           |
| `navigation-mode`  | Navigation behavior. Use `internal` for embedded viewers or `hash` for URL-hash navigation. Defaults to `internal`.       |
| `initial-document` | ID of the document selected when the viewer loads. The first manifest document is used when no matching ID is configured. |

The manifest, Markdown files, and referenced assets must be available through HTTP from the consuming application.

### Angular integration

Import the viewer once, for example in `main.ts`:

```ts
import "markdown-doc-tree/viewer";
```

Angular must be configured to accept custom elements.

For a standalone component:

```ts
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
} from "@angular/core";

@Component({
  selector: "app-help",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: "./help.component.html",
})
export class HelpComponent {
  readonly manifestUrl =
    "/assets/documentation/docs-manifest.json";

  readonly initialDocument = "1";
}
```

Use attribute bindings in the component template:

```html
<markdown-doc-tree
  [attr.manifest-url]="manifestUrl"
  [attr.initial-document]="initialDocument"
  navigation-mode="internal"
></markdown-doc-tree>
```

For an NgModule-based application, add `CUSTOM_ELEMENTS_SCHEMA` to the module instead:

```ts
import {
  CUSTOM_ELEMENTS_SCHEMA,
  NgModule,
} from "@angular/core";

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule {}
```

The generated manifest directory must be copied into Angular's served assets. For example:

```text
src/assets/documentation/
├─ docs-manifest.json
└─ content/
   ├─ 1_Getting-Started.md
   └─ images/
      └─ installation.png
```

The Web Component does not require Playwright or Chromium. Those dependencies are only used by local PDF generation.

## Viewer styling

The viewer uses shadow DOM to isolate its internal styles. Consuming applications can customize the exposed elements through CSS shadow parts.

Example:

```css
markdown-doc-tree {
  min-height: 40rem;
  color: #202124;
  background: #ffffff;
  font-family: Arial, sans-serif;
}

markdown-doc-tree::part(layout) {
  grid-template-columns: 20rem minmax(0, 1fr);
  min-height: 40rem;
}

markdown-doc-tree::part(sidebar) {
  padding: 1.5rem;
  border-right: 1px solid #d0d7de;
  background: #f6f8fa;
}

markdown-doc-tree::part(brand) {
  color: #0b57d0;
  font-size: 1.25rem;
}

markdown-doc-tree::part(navigation-link) {
  border-radius: 0.25rem;
  color: #374151;
}

markdown-doc-tree::part(navigation-link-active) {
  color: #ffffff;
  background: #0b57d0;
  font-weight: 700;
}

markdown-doc-tree::part(document-id) {
  color: inherit;
  opacity: 0.7;
}

markdown-doc-tree::part(content) {
  width: min(75rem, 100%);
  padding: 3rem;
}
```

The following parts are public:

| Part                     | Element                                        |
| ------------------------ | ---------------------------------------------- |
| `layout`                 | Root layout container                          |
| `sidebar`                | Navigation sidebar                             |
| `brand`                  | Viewer brand heading                           |
| `navigation`             | Navigation element containing the tree         |
| `navigation-list`        | Each generated navigation list                 |
| `navigation-item`        | Each generated navigation list item            |
| `navigation-link`        | Every document navigation link                 |
| `navigation-link-active` | The currently selected document link           |
| `document-id`            | Numeric document ID displayed before the title |
| `content`                | Main Markdown content container                |

Multiple matching elements may expose the same part. For example, every nested tree list exposes `navigation-list`, and every document link exposes `navigation-link`.

The active link exposes both parts simultaneously:

```text
navigation-link navigation-link-active
```

This means base link styles can be defined through `navigation-link` and only the selected state overridden through `navigation-link-active`.

The host element itself can be styled with the normal `markdown-doc-tree` selector. This is useful for inherited properties such as fonts and colors, as well as the component's outer height and background.

The `content` part exposes the Markdown container, but the individual rendered headings, tables, images, code blocks, and other descendants are not separate public parts.


## PDF generation

The PDF pipeline is:

```text
validated Markdown
→ combined HTML manual
→ A4 print styling
→ Chromium PDF export
```

The generated PDF supports:

- A4 page size
- title page
- chapter page breaks
- Markdown headings
- lists
- tables
- code blocks
- embedded images

## Example scripts

Validate the example documentation:

```bash
npm run example:validate
```

Generate the example manifest:

```bash
npm run example:manifest
```

Generate the example PDF:

```bash
npm run example:pdf
```

## Project status

`v0.1.0` proves the complete vertical slice:

```text
Markdown + images
→ validation
→ manifest
→ browser viewer
→ printable PDF
```

See the [changelog](./CHANGELOG.md) for released features and the [roadmap](./ROADMAP.md) for planned work.

## License

ISC
