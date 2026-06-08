# Fleet Dispatch App

Aplicație React pentru dispecerat flotă. Funcționează cu localStorage — datele se salvează în browser.

## Deploy pe Netlify (3 pași)

### Varianta 1 — Drag & Drop (cel mai simplu)

1. Instalează Node.js de pe https://nodejs.org (versiunea LTS)
2. Deschide terminal în folderul `fleet-app`
3. Rulează:
   ```
   npm install
   npm run build
   ```
4. Mergi pe https://app.netlify.com
5. Trage folderul `build/` direct în pagina Netlify
6. Gata — primești un link de tipul `https://xxxxx.netlify.app`

### Varianta 2 — GitHub + Netlify (recomandat pentru update-uri ușoare)

1. Creează cont GitHub și un repo nou
2. Urcă folderul `fleet-app` în repo
3. În Netlify: New Site → Import from GitHub → selectezi repo-ul
4. Build command: `npm run build`
5. Publish directory: `build`
6. Deploy!

## Utilizare

- **Tab Flotă**: statusul tuturor camioanelor, editabil cu butonul ✏️
- **Tab IMI**: declarațiile IMI per șofer, cu alertă când expiră în curând
- **To Do**: lista de acțiuni zilnice, cu priorități și bifat/completat
- **Print**: buton în dreapta sus, generează A4 landscape

## Update date

Când vrei să updatezi camioanele/șoferii permanent, editează fișierul `src/data.js`.
