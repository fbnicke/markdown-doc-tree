# Roadmap

## v0.2.0 — Embeddable Viewer

The goal of v0.2.0 is to turn the standalone viewer into a reusable framework-independent Web Component.

### Progress

* [x] Extract the viewer into a `<markdown-doc-tree>` Web Component
* [x] Support manifest configuration through an HTML attribute
* [x] Keep the existing Vite application as a demo shell
* [x] Encapsulate viewer styles through shadow DOM
* [x] Expose public viewer styling hooks through CSS shadow parts
* [x] Produce a standalone ESM viewer bundle
* [x] Expose the viewer through `markdown-doc-tree/viewer`
* [x] Verify direct embedding in plain HTML
* [x] Verify direct consumption from an Angular application
* [x] Add isolated internal navigation for embedded help-dialog usage
* [x] Support selecting the initial document through component configuration
* [ ] Document Angular integration
* [ ] Add PDF table-of-contents page numbers
* [ ] Preserve Linux and Windows compatibility


### Completion criteria

v0.2.0 is complete when:

- the component can be embedded without an iframe
- an Angular application can consume it directly
- the standalone demo still works
- consuming applications can override viewer styles through public CSS shadow parts
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
- Investigate lighter open-source PDF-generation alternatives to the current Playwright/Chromium adapter. Consider WeasyPrint or Typst