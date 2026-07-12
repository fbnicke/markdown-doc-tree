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
