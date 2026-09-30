# Portfolio CMS — admin panel for the website

> **हिंदी में ज़रूरी बातें**
> - वेबसाइट चलाने के लिए: `npm start` (या `node cms/server.js`) — फिर ब्राउज़र में
>   `http://localhost:4173/` खोलें।
> - Admin panel: `http://localhost:4173/admin`
> - सबसे पहली बार चलाने पर स्क्रीन पर **username और password** छपेगा। उसे सँभाल कर रखें —
>   वह दोबारा नहीं दिखेगा। बाद में dashboard से बदल सकते हैं।
> - **आपकी एडिटिंग तुरंत लाइव नहीं होती।** जब तक आप **Publish** नहीं दबाते, वेबसाइट पर आने वाले
>   लोगों को पुरानी वेबसाइट ही दिखती रहेगी।
> - ऊपर हमेशा लिखा रहता है: **Unsaved changes** / **Saved — not published yet** / **Published**।
> - **Preview** दबाकर पहले देख लें कि नया रूप कैसा लगेगा, फिर Publish करें।
> - Delete करने पर हमेशा पुष्टि (confirmation) पूछी जाती है।

---

## What this is

An admin dashboard that sits **on top of** the existing portfolio website. The design is
untouched — `beekesh-portfolio.html` is still the single source of the layout. The server
only feeds it content and hides the editing UI from visitors.

The whole system has **no npm dependencies**. It uses only what Node ships with:
`node:http`, `node:sqlite`, `node:crypto`. (`jsdom` is needed only by the one-time
importer that read the existing content out of the page.)

Requires **Node 22.5 or newer**.

## Run it

```bash
node cms/server.js            # or: npm start
```

Then:

| URL | What it is |
|-----|------------|
| `http://localhost:4173/` | The public website (published content, no admin UI at all) |
| `http://localhost:4173/admin` | The dashboard (login required) |
| `http://localhost:4173/preview` | The draft, exactly as a visitor would see it (login required) |

Environment variables:

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `4173` | Port to listen on |
| `HOST` | `127.0.0.1` | Bind address. Use `0.0.0.0` to expose it on the network |
| `ADMIN_USER` | `admin` | Username created on first run |
| `ADMIN_PASS` | random | Password created on first run (printed once) |
| `MAX_UPLOAD_MB` | `120` | Largest upload accepted |
| `DATA_DIR` | `cms/data` | Where the database lives |
| `MEDIA_DIR` | `cms/media` | Where uploads live |
| `TEMPLATE` | `beekesh-portfolio.html` | The page the CMS fills in |

### Locked out?

Run this with the server stopped — it changes nothing else:

```bash
node cms/set-password.js --list        # who exists
node cms/set-password.js --random      # generate and print a new one
node cms/set-password.js myNewPass     # or choose it yourself (min 8 chars)
```

The password is only ever stored as a scrypt hash, so it cannot be read back out — only replaced.

## The one rule that matters

**Editing never touches the live site.**

Everything the dashboard changes goes into the **draft**. The public page is rendered from
the **published** copy. Only the Publish button moves one into the other. That is why:

- an unfinished edit can never be seen by a visitor,
- "Discard changes" can always throw the draft away and start again from what is live,
- Preview can show you the draft while the live site keeps serving the old version.

## What the dashboard controls

- **Every text on the page** — hero, About Me, Selected Work cards, section labels,
  the contact panel, the footer line (36 text fields).
- **Stats strip** — add / edit / delete / duplicate / reorder / hide.
- **Software & Tools** — including uploading each icon.
- **Motion Graphics** — cards, colour theme, wide 16:9 flag, poster image, multiple videos.
- **Experience**, **Education**, **Languages**, **Design Process steps** — full lists.
- **Contact methods** — label, value, icon, and what clicking it does (WhatsApp / email /
  phone / link).
- **Galleries** — the four project panels behind the Selected Work cards: add, replace,
  reorder and delete images, plus each panel's title and intro text.
- **Section visibility and order** — show/hide any built-in section, move it up or down.
- **New sections** — “+ Add New Section” builds a section from headings, paragraphs,
  images, videos, galleries, cards, buttons, a contact block or free text, with its own
  background colour, position and visibility.

Every list item has: **Add · Edit · Duplicate · Move up · Move down · Hide/Show · Delete**,
and every delete asks for confirmation first.

## Where things are stored

```
cms/
  server.js          the HTTP server and all routes
  lib/db.js          SQLite storage (draft, published, users, sessions, media)
  lib/auth.js        scrypt password hashing + session cookies
  lib/render.js      injects content into the page; strips the editing UI for visitors
  lib/…              
  public/            the dashboard (admin.html, admin.js, admin.css)
  import-content.js  one-time: reads the current content out of the page
  seed.json          the content the database starts from
  test-cms.js        end-to-end checks
  data/cms.db        the database (created on first run)
  media/             every uploaded image and video, as a real file
```

**Media is never stored inside the HTML or the database.** Uploads are written to
`cms/media/` and the database keeps only the path (`/media/…`).

**`seed.json` is the safety net for that.** It keeps the original artwork as data URIs, and the
server writes any missing file out again **on every boot**. So if `cms/media/` is ever emptied or
deleted, restarting the server puts every image back under the same content-hashed name and all the
existing `/media/…` URLs start working again. It also fills in any *new* fields the page gained
since the site was first seeded, without touching the values you have already set.

## Checking it works

With the server running, in a second terminal:

```bash
node cms/test-cms.js
```

It walks through login, editing, the draft/live separation, uploading, publishing,
discarding, hiding a section, building a new section, and confirms that the page a visitor
receives contains no toolbar, no editable element and no file input.

## Re-importing the content

If you edit `beekesh-portfolio.html` by hand and want the CMS to pick up the new wording:

```bash
npm install          # only needed for this step (jsdom)
node cms/import-content.js
```

This rewrites `cms/seed.json`. Delete `cms/data/cms.db` afterwards if you want the
database to be rebuilt from it.

## Putting it on the internet

The app is a plain single-port HTTP service, so it runs anywhere Node 22+ does. Two things
to change for a real deployment:

1. Put it behind **HTTPS** and set `HOST=0.0.0.0`, so `https://harivanshianim.com/admin`
   works. The session cookie is marked `HttpOnly` and `SameSite=Strict`; add `Secure` once
   HTTPS is in place (`cms/lib/auth.js`, `sessionCookie`).
2. Keep `cms/data/` and `cms/media/` on **persistent storage**, or both the content and
   the uploads are lost when the service restarts.

A reverse proxy (nginx, Caddy) in front of `PORT` is the usual setup.
