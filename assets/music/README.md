# Eigene Musik für Shady

Shady erzeugt seine Musik normalerweise selbst im Browser. Wenn du echte Musikstücke verwenden willst, leg sie in diesen Ordner und trag sie in `tracks.json` ein. Das Spiel spielt sie dann in Schleife ab. Stücke, die nicht eingetragen sind, bleiben synthetisch.

## So geht's

1. Musikdatei in diesen Ordner legen, am besten `.ogg` oder `.mp3`, idealerweise ein nahtloser Loop.
2. In `tracks.json` eintragen, für welche Stelle im Spiel sie gedacht ist:

```json
{
  "menu": "menu.ogg",
  "yard": "innenhof.mp3",
  "garden": "garten.ogg",
  "roof": "dach.ogg",
  "cellar": "keller.ogg",
  "boss": "boss.ogg",
  "final": "endboss.ogg"
}
```

| Name | Wann es läuft |
| --- | --- |
| `menu` | Hauptmenü und alle Menüs |
| `yard` | Spiel auf der Karte Innenhof |
| `garden` | Spiel im Garten |
| `roof` | Spiel auf dem Dach |
| `cellar` | Spiel im Keller |
| `boss` | Bosskampf |
| `final` | Kampf gegen den Sonnenkern |

Die Dateien werden nur geladen, wenn das Spiel über eine Webadresse läuft (z. B. GitHub Pages oder itch.io). Beim Öffnen per Doppelklick bleibt die eingebaute Musik.

## Wo es freie Musik gibt

Achte immer auf die Lizenz. Am einfachsten sind Stücke unter **CC0** (gemeinfrei, keine Namensnennung nötig). Bei **CC BY** musst du den Urheber nennen, zum Beispiel in der README.

- [OpenGameArt.org](https://opengameart.org/art-search-advanced?field_art_type_tid%5B%5D=12): Musik für Spiele, nach Lizenz filterbar
- [Pixabay Music](https://pixabay.com/music/): eigene Pixabay-Lizenz, Bedingungen vor Nutzung lesen
- [Free Music Archive](https://freemusicarchive.org/): viele Creative-Commons-Stücke, Lizenz pro Stück prüfen

Nutze keine Musik, deren Lizenz Spiele oder Weitergabe ausschließt.
