# Legislative Explorer

A historical Legislative Yuan member and parliamentary record search system.

Supports legislators from the 1st through 11th Legislative Yuan, including member directories, profiles, legislative proposals, attendance records, and parliamentary proceedings.

## Features

* Search legislators by term and name
* View official member profiles and service history
* Browse legislative proposals and co-signatories
* Browse parliamentary meetings, attendance, and questioning records
* Support for the 1st–11th Legislative Yuan

## Architecture

* Pure static website
* HTML5, CSS3, and modern JavaScript
* No backend
* No database
* No npm runtime dependency
* Hash-based routing
* IndexedDB for client-side caching

### Data Sources

**Terms 2–11**

Data is retrieved from the [OpenFun Legislative Yuan API](https://v2.ly.govapi.tw/), which provides CORS-enabled access to Legislative Yuan data.

**Term 1**

Historical data from the Legislative Yuan National Library is stored as static JSON under:

```text
static/data/term-01-legislators.json
```

## Development

Start a local static server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Deployment

The project can be deployed directly to GitHub Pages or Vercel as a static site.

## License

Licensed under the GNU General Public License v3.0 (GPL-3.0).

See `LICENSE` for the full license text.
