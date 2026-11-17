# Soundbert

Eine kleine Web-App für Kleinkinder und ihre Eltern: Geräusche aufnehmen, in der **Geräusche-Kiste** sammeln, daraus eine **Geschichte** zusammensetzen und die eigene Stimme im **Stimmen-Zauber** verwandeln.

Live: https://haucky.github.io/soundbert/

## Bereiche

- **Kiste**: Jedes Geräusch ist ein Bild mit einer Aufnahme. Antippen spielt es ab, das Mikrofon-Feld nimmt ein neues auf (erst Bild wählen, dann aufnehmen, danach spielt es sofort einmal ab).
- **Geschichte**: Eine Reihenfolge von Geräuschen aus der Kiste. „Neues Bild“ wählt ein Geräusch aus der Kiste oder nimmt ein neues auf. „Ganze Geschichte“ spielt alles nacheinander ab. Wird ein Geräusch neu aufgenommen, ändert es sich überall, wo es vorkommt.
- **Zauber**: Etwas aufnehmen und als Riese, Maus, Höhlen-Echo oder Roboter abspielen (Web Audio).
- **Hör-Modus** (Ohr-Symbol oben): schwarzer Bildschirm. Irgendwo **halten = aufnehmen**, **tippen = letztes Geräusch abspielen**. Vibration statt Bild. Beenden: × gedrückt halten oder Zurück-Taste. Aufnahmen landen mit dem Ohr-Bild in der Kiste. **Aus der Geschichte geöffnet** spielt Tippen die ganze Geschichte (erneutes Tippen unterbricht nicht), und Halten nimmt ein neues Bild am Ende der Geschichte auf.
- **Erzählstimme**: In der Geschichte „Erzählen“ antippen und bis zu 60 Sekunden einsprechen. Erzählstimmen gehören nur zur Geschichte, nicht zur Kiste.

## Schneiden & Angleichen

Jede Aufnahme wird automatisch geschnitten (Stille am Anfang/Ende; Knackser vom Drücken in den ersten 0,25 s bzw. letzten 0,2 s und kurze, abgesetzte Geräuschfetzen am Rand werden ignoriert) und in der Lautstärke angeglichen. Die **Originalaufnahme bleibt unverändert**; gespeichert werden nur Schnittpunkte und Verstärkung. Im Eltern-Modus ändert das Bild-Symbol auf einer Kachel das Bild (60 Bilder in 6 Gruppen); die Schere öffnet den Editor: Anfang und Ende auf der Wellenform verschieben, „Probehören“, „Automatisch“, „Alles“, „Bild ändern“, „Neu aufnehmen“. Ältere, nicht von Hand geschnittene Aufnahmen werden beim Start mit dem verbesserten Verfahren neu geschnitten.

## Teilen & Sichern (Eltern-Modus › ⋯)

- **Geschichte als MP3**: wird im Browser gebaut (lamejs) und über das Android-Teilen-Menü verschickt (z. B. WhatsApp) oder heruntergeladen.
- **Alles exportieren (ZIP)**: `metadata.json` (Bild, Art, Datum, Schnittpunkte, Verstärkung, Notizfeld) plus alle Originalaufnahmen in `audio/`.
- **Sicherung laden**: fügt fehlende Aufnahmen hinzu; die Geschichte wird übernommen, wenn die aktuelle leer ist.

## Eltern-Modus

Das Schloss oben rechts **1,2 Sekunden gedrückt halten**. Dann lassen sich Geräusche schneiden, löschen oder neu aufnehmen, Bilder in der Geschichte verschieben oder herausnehmen, der Titel ändern und über ⋯ sichern und teilen. Antippen sperrt wieder; beim Verlassen der App sperrt es automatisch.

## Technik

- Datenmodell steht oben in `app.js`; jedes Geräusch hat ein Feld `note` für ein späteres Stimmen-Tagebuch.

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

MP3-Encoder: [lamejs](https://github.com/zhuker/lamejs) (LGPL-3.0, unverändert in `vendor/`).

Schrift: [Nunito](https://fonts.google.com/specimen/Nunito), SIL Open Font License (siehe `fonts/OFL.txt`).
