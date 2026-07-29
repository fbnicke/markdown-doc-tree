# PDF Manuals

Generate a printable manual from the same Markdown directory:

```bash
npx markdown-doc-tree pdf ./docs \
  --output ./output/manual.pdf \
  --title "Example Documentation"
```

The generated manual supports:

* A4 pages
* a title page
* a table of contents with page numbers
* chapter page breaks
* headings and paragraphs
* lists and tables
* code blocks
* embedded images

PDF generation runs on the developer machine and requires Playwright Chromium.

