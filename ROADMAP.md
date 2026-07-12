# Roadmap

## v0.2.0 — Embeddable Viewer

The goal of v0.2.0 is to turn the standalone viewer into a reusable framework-independent Web Component.

### Planned

- Extract the viewer into a `<markdown-doc-tree>` Web Component
- Support configuration through HTML attributes
- Allow direct embedding in Angular, React, Vue, and plain HTML
- Keep the existing Vite application as a demo shell
- Encapsulate viewer styles
- Add PDF table-of-contents page numbers
- Document Angular integration
- Preserve Linux and Windows compatibility

### Completion criteria

v0.2.0 is complete when:

- the component can be embedded without an iframe
- an Angular application can consume it directly
- the standalone demo still works
- the PDF TOC contains correct page numbers
- all tests and cross-platform checks remain green

## Later ideas

- Full-text search
- Collapsible navigation nodes
- Frontmatter metadata
- Themes
- Watch mode
- Detailed heading-level TOC
- Multilingual documentation
- Custom printable page frames and company branding
- Configurable logos, headers, footers, margins, and page backgrounds
- Image layout controls for size, alignment, and position