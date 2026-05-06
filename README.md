# Khoroo Map

Interactive map for exploring Ulaanbaatar khoroo boundaries from `khoroos.json`.

Live site: [khoroo.tuvshin.dev](https://khoroo.tuvshin.dev)

## Run locally

This project is a static website, so you only need a small local web server.

### Option 1: Python

```bash
python -m http.server 8123
```

Then open [http://localhost:8123](http://localhost:8123).

### Option 2: Node

```bash
npx serve .
```

Then open the local URL shown in the terminal.

## Project files

- `index.html` - page structure
- `styles.css` - site styling
- `app.js` - map logic, filters, and selection behavior
- `khoroos.json` - khoroo boundary data

## Notes

- Open the site through `http://localhost...`, not directly as a `file://` page.
- The app fetches `khoroos.json`, so it needs to be served by a local web server.
