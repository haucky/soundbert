# Soundbert

Eine kleine Web-App für Kleinkinder und ihre Eltern: Geräusche aufnehmen, in der **Geräusche-Kiste** sammeln, daraus eine **Geschichte** zusammensetzen und die eigene Stimme im **Stimmen-Zauber** verwandeln.

Live: https://haucky.github.io/soundbert/

## Bereiche

- **Kiste**: Jedes Geräusch ist ein Bild mit einer Aufnahme. Antippen spielt es ab, das Mikrofon-Feld nimmt ein neues auf (erst Bild wählen, dann aufnehmen, danach spielt es sofort einmal ab).
- **Geschichte**: Eine Reihenfolge von Geräuschen aus der Kiste. „Neues Bild“ wählt ein Geräusch aus der Kiste oder nimmt ein neues auf. „Ganze Geschichte“ spielt alles nacheinander ab. Wird ein Geräusch neu aufgenommen, ändert es sich überall, wo es vorkommt.
- **Zauber**: Etwas aufnehmen und als Riese, Maus, Höhlen-Echo oder Roboter abspielen (Web Audio).

## Eltern-Modus

Das Schloss oben rechts **1,2 Sekunden gedrückt halten**. Dann lassen sich Geräusche löschen oder neu aufnehmen, Bilder in der Geschichte verschieben oder herausnehmen und der Titel ändern. Antippen sperrt wieder; beim Verlassen der App sperrt es automatisch.

## Technik

- Reines HTML, CSS und JavaScript, kein Build-Schritt.
- Aufnahme mit `MediaRecorder`, Speicherung in IndexedDB – alles bleibt auf dem Gerät.
- PWA mit Manifest und Service Worker: auf Android in Chrome „Zum Startbildschirm hinzufügen“ bzw. „App installieren“.
- Das Mikrofon braucht HTTPS (GitHub Pages) oder `localhost`.

Lokal testen:

```sh
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Nach Änderungen an Dateien in `sw.js` die `VERSION` hochzählen, damit installierte Apps die neue Fassung laden.

Schrift: [Nunito](https://fonts.google.com/specimen/Nunito), SIL Open Font License (siehe `fonts/OFL.txt`).
