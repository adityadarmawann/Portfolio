# Muhamad Aditya Darmawan - Portfolio

## Deskripsi (ID)
Website portfolio pribadi berbasis static HTML/CSS/JavaScript dengan dukungan CMS (Decap CMS + Netlify Identity + Git Gateway) untuk mengelola konten tanpa edit kode manual.

## Description (EN)
Personal portfolio website built with static HTML/CSS/JavaScript and CMS support (Decap CMS + Netlify Identity + Git Gateway) to manage content without manual code edits.

## Live Site
- Website: `https://portfolio-adityadarmawan.netlify.app`
- CMS Admin: `https://portfolio-adityadarmawan.netlify.app/admin/`

## Fitur Utama (ID)
- Hero section modern dengan dukungan bilingual (EN/ID)
- Section konten lengkap: About, Education, Skills, Certifications, Projects, Experience, Publications, Gallery, Contact
- Bilingual switching (`EN | ID`) dengan i18n internal
- SEO metadata dinamis (title, description, OG)
- Konten terstruktur via JSON
- CMS untuk update konten tanpa sentuh kode frontend

## Key Features (EN)
- Modern hero section with bilingual support (EN/ID)
- Complete content sections: About, Education, Skills, Certifications, Projects, Experience, Publications, Gallery, Contact
- Bilingual switch (`EN | ID`) powered by internal i18n
- Dynamic SEO metadata (title, description, OG)
- Structured JSON content
- CMS-based content updates without touching frontend code

## Tech Stack
- HTML5
- CSS3
- Vanilla JavaScript
- Decap CMS (`admin/config.yml`)
- Netlify Identity + Git Gateway
- Netlify Hosting

## Struktur Proyek / Project Structure

```text
.
├── index.html
├── 404.html
├── _redirects
├── robots.txt
├── sitemap.xml
├── admin/
│   ├── index.html
│   └── config.yml
├── content/
│   ├── site-settings.json
│   ├── education.json
│   ├── skills.json
│   ├── certifications.json
│   ├── projects.json
│   ├── experience.json
│   ├── publications.json
│   ├── gallery.json
│   └── contacts.json
└── Asset/
```

## Cara Menjalankan Lokal (ID)
Karena ini project static, cukup jalankan local server dari root folder.

Contoh dengan Python:

```bash
python -m http.server 5500
```

Lalu buka:
- `http://localhost:5500`
- `http://localhost:5500/admin/`

Catatan: login CMS (Identity/Git Gateway) umumnya aktif penuh di environment Netlify.

## Run Locally (EN)
Since this is a static project, run a local server from the root directory.

Example with Python:

```bash
python -m http.server 5500
```

Then open:
- `http://localhost:5500`
- `http://localhost:5500/admin/`

Note: CMS login features (Identity/Git Gateway) are usually fully available in Netlify environment.

## Cara Edit Konten / How to Edit Content

### 1. Via CMS (Direkomendasikan / Recommended)
1. Buka `/admin/`
2. Login menggunakan akun Netlify Identity
3. Edit konten di collection yang tersedia
4. Simpan dan publish

### 2. Via File JSON
Edit langsung file di folder `content/` sesuai kebutuhan section.

## Konfigurasi Penting / Important Configuration

### `admin/config.yml`
- Mengatur backend CMS (`git-gateway`)
- Mengatur collection dan schema field

### `_redirects`
- Canonical redirect `index.html -> /`
- Bypass endpoint `/.netlify/*` agar Identity/Git Gateway tetap jalan
- Fallback ke `404.html`

## Deployment

### ID
Project ini ideal untuk Netlify.

Langkah umum:
1. Push repository ke GitHub
2. Connect repository ke Netlify
3. Aktifkan Identity dan Git Gateway
4. Pastikan domain dan `site_url` di `admin/config.yml` sesuai

### EN
This project is best deployed on Netlify.

General steps:
1. Push repository to GitHub
2. Connect repository to Netlify
3. Enable Identity and Git Gateway
4. Ensure domain and `site_url` in `admin/config.yml` are correct

## Catatan / Notes
- Semua konten utama sudah sinkron dengan schema CMS terbaru.
- i18n fallback ada di `index.html`, tetapi source utama konten tetap dari `content/site-settings.json` dan file JSON section lain.

## Author
Muhamad Aditya Darmawan
