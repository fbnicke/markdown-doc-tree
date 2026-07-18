# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

### Added

* Added the framework-independent `<markdown-doc-tree>` Web Component.
* Added configuration through the `manifest-url` HTML attribute.
* Added a dedicated ESM library build for the embeddable viewer.
* Added the `markdown-doc-tree/viewer` package export for registering the Web Component in consuming applications.
* Added shadow-DOM style encapsulation for the viewer.


### Changed

* Restructured the source code around ports-and-adapters boundaries, separating domain logic, application use cases, inbound adapters, outbound adapters, and ports.
* Moved the CLI into a dedicated inbound adapter while preserving the existing commands and executable behavior.
* Replaced direct filesystem access in documentation validation and manifest generation with injected outbound ports.
* Added `DocumentationSourceReader` for loading documentation sources independently of their storage mechanism.
* Added `DocumentationManifestPublisher` for publishing generated manifests and documentation content independently of the application use case.
* Added filesystem implementations for documentation source reading and manifest publication.
* Updated the public package exports, CLI executable path, example scripts, and tests to reflect the new architecture.
* Reduced the existing Vite viewer application to a demo shell that consumes the Web Component through its public viewer entry point.
* Preserved the existing `?manifest=...` demo configuration by forwarding it to the component’s `manifest-url` attribute.
* Made custom-element registration safe when the viewer bundle is imported more than once.


### Breaking

* `scanDocumentDirectory()` has been replaced by `fileSystemDocumentationSourceReader.read()`.
* `validateDocumentationDirectory()`, `generateDocumentationManifest()`, and `generateDocumentationManual()` now require their outbound dependencies to be supplied explicitly.
* Internal source module paths have changed as part of the ports-and-adapters restructuring.

### Known limitations

* PDF manual generation still contains direct filesystem, path, URL, and Playwright dependencies inside the application use case. These responsibilities will be extracted behind an outbound port.
* The current tests continue to use the real filesystem adapters.
* The viewer package entry currently supports side-effect registration but does not yet publish separate TypeScript declaration files for the exported `DocumentViewerElement` class.

### Fixed

* Prevented stale document responses from replacing the most recently selected document.
* Rendered document loading failures inside the viewer instead of producing unhandled promise rejections.

## [0.1.0]

### Added

- Numbered Markdown filename parsing
- Hierarchical document tree generation
- Documentation validation with readable diagnostics
- Configurable missing-parent handling
- JSON manifest generation
- Standalone browser viewer
- Hash-based document navigation
- Relative image and link resolution
- Printable A4 PDF generation
- PDF table of contents
- Cross-platform CLI support
- Linux and Windows verification