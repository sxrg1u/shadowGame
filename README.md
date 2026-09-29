# Shady

### [▶ Jetzt spielen](https://sxrg1u.github.io/shady/)

**Ein chaotisches Browserspiel über Licht und Schatten.** Du bist ein kleines Schattenwesen auf einem sonnigen Innenhof. Die Sonne wandert im Kreis, und mit ihr wandert jeder Schatten. Bleib im Dunkeln, weich allem aus, was das Chaos-Rad dir entgegenwirft, besiege nach jeder Stufe einen Boss und bau dir mit Upgrade-Karten deine eigene Runde.

## Screenshots

| | |
| --- | --- |
| ![Hauptmenü von Shady mit dem Schriftzug „Shady“, den Menüknöpfen und der täglichen Herausforderung](screenshots/hauptmenue.png) | ![Normales Spiel auf Stufe 3: gelber Innenhof, dunkelblaue Schatten der Säulen, in der Mitte die kleine schwarze Spielfigur](screenshots/spiel-normal.png) |
| *Das Hauptmenü* | *Ein normales Spiel ohne Chaos* |
| ![Farbchaos auf Stufe 2: türkiser Innenhof, bunte Säulen, in der Mitte die Ankündigung „Chaos-Rad: Farbchaos“](screenshots/farbchaos-stufe-2.png) | ![Farbchaos auf Stufe 6: mintgrüner Innenhof, weinrote Schatten, Säulen und Anzeige in wild gemischten Farben](screenshots/farbchaos-stufe-6.png) |
| *Farbchaos auf Stufe 2: Es geht los, nur ein Teil der Farben kippt* | *Farbchaos auf Stufe 6: Kaum noch etwas hat seine echte Farbe* |
| ![Farbchaos auf Stufe 10 im Kampf gegen den Sonnenkern: rosa Innenhof, grüne Schatten, bunte Laser und ein gelber Endboss](screenshots/farbchaos-stufe-10-boss.png) | ![Animation: Farbchaos auf Stufe 8 mit gedämpften Blitzen, die Farben gleiten weich ineinander](screenshots/farbchaos.gif) |
| *Farbchaos auf Stufe 10 im Bosskampf gegen den Sonnenkern* | *Farbchaos mit gedämpften Blitzen: weiche Übergänge statt harter Wechsel* |

Die Bilder erzeugt [`tools/screenshots.mjs`](tools/screenshots.mjs) automatisch mit [Playwright](https://playwright.dev). Neu erzeugen (Node.js nötig, das Spiel selbst braucht nichts davon):

```bash
cd tools
npm install
npm run screenshots
```

## Spielen

1. `index.html` herunterladen oder das Repo klonen.
2. Die Datei per Doppelklick im Browser öffnen.

Es gibt nichts zu installieren. Das ganze Spiel steckt in dieser einen Datei. Nur für das Online-Duell braucht es eine Internetverbindung.

## Spielmodi

- **Kampagne:** 10 Stufen, 9 Bosse. Am Ende wartet der **Sonnenkern**. Besiegst du ihn, hast du gewonnen.
- **Endlos:** Kein Ende. Jede Stufe wird härter, alle 10 Stufen kommt der Sonnenkern, und alle 5 Stufen gibt es 10 % mehr Punkte.
- **Tägliche Herausforderung:** Jeden Tag ein anderes Regelset und derselbe Innenhof für alle. Erreiche Stufe 6 und hol dir 1 500 Punkte. Wer mehrere Tage hintereinander schafft, baut eine Serie auf.
- **Boss üben:** Direkt gegen Prisma, Käferkönigin, Sonnenstier oder (ab Stufe 11) den Sonnenkern.
- **Online-Duell:** Siehe unten.

Kampagne, Endlos und Boss üben gibt es auf **Leicht**, **Normal** und **Schwer**.

### Tagesregeln

| Regel | Was passiert |
| --- | --- |
| Nur Fallen | Es tauchen nur Fallen auf, dafür zählt Tau dreifach. |
| Doppelte Sonne | Zwei Sonnen, die ganze Zeit. Wo nur ein Schatten liegt, brennt es halb so stark. |
| Käferplage | Dreimal so viele Käfer, weggedashte Käfer geben dreifach Punkte. |
| Chaos pur | Das Chaos-Rad dreht sich alle 3 Sekunden. |
| Winzlinge | Du bist die ganze Zeit winzig, alles andere ist schneller. |
| Bossrausch | Stufen dauern nur 6 Sekunden, Bosse haben ein Leben weniger. |
| Spiegelwelt | Deine Steuerung ist die ganze Zeit verdreht. |
| Glaskanone | Keine Herzen, höchstens 60 Kraft, dafür doppelte Punkte. |
| Dash-Fieber | Der Dash lädt fast sofort, die Sonne brennt 30 % stärker. |
| Hochsommer | Schatten sind 35 % kürzer, Tau gibt doppelt so viel Kraft. |
| Wolkentag | Ständig ziehen Wolken, aber die Sonne rast. |
| Mondnacht | Schatten sind 40 % länger, das Brennglas jagt dich von Anfang an. |

## So funktioniert es

- **Licht kostet Kraft.** Im Sonnenlicht sinkt deine Kraftleiste schnell, im Schatten lädt sie langsam wieder auf. Bei null bist du verdampft, außer ein Herz rettet dich.
- **Die Schatten wandern.** Die Sonne zieht im Kreis und wird mit jeder Stufe schneller. Die kleine Sonne am Rand zeigt, woher das Licht gerade kommt.
- **Stufen:** Alle 12 Sekunden steigt die Stufe. Eine Säule stürzt ein, eine neue wächst woanders, und danach kommt ein Boss.
- **Punkte:** 10 pro Sekunde, dazu Tau, Goldtau, Kombos und Boss-Siege. Nach jeder Runde landen deine Punkte auf dem **Punktekonto**.

## Upgrades nach jedem Boss

Nach jedem besiegten Boss ziehst du drei Karten und nimmst eine. Karten sind gewöhnlich, selten oder episch, und viele lassen sich mehrfach stapeln. So spielt sich jede Runde anders.

Beispiele: **Schnelldash** (Dash lädt schneller), **Schattenspur** (Dash hinterlässt Schatten), **Zäher Schatten** (Schatten halten länger), **Lange Schatten**, **Extraherz** (+1 Herz), **Doppeldash**, **Wuchtdash**, **Schattenklinge**, **Blasenquelle**, **Phönix**, **Baumeister** und mehr. Insgesamt gibt es 20 Karten.

## Garderobe: Skins und Hüte

12 Skins und 13 Hüte für deine Spielfigur. Manche kaufst du mit Punkten vom Konto, andere gibt es nur für Boss-Siege, zum Beispiel die Käferkrone für die Käferkönigin, die Stierhörner für den Sonnenstier oder die Sonnenkrone für den Sonnenkern. Der Heiligenschein gehört dir, wenn du einen Boss ohne Treffer besiegst.

## Erfolge und Statistik

28 Abzeichen wie „10 Käfer weggedasht“, „Boss ohne Treffer“, „Kombo ×5“ oder „3 Tage in Folge“. Dazu eine Statistik (Runden, Spielzeit, Bosse pro Typ, Dashes, Treffer …) und eine Bestenliste mit den zehn besten Runden in Kampagne und Endlosmodus.

## Online-Duell

1. Einer klickt auf **Mehrspieler → Raum erstellen** und schickt den fünfstelligen Code oder den Einladungslink.
2. Der andere gibt den Code ein und klickt **Beitreten**.
3. Der Gastgeber startet das Duell.

Beide starten auf demselben Innenhof und sehen den anderen als Geist. Jeder besiegte Boss schickt dem Gegner einen Angriff (Käferschwarm, Suchraketen, Lasergitter …), eine ×5-Kombo einen kleinen. Wer länger überlebt, gewinnt. Danach gibt es eine Revanche.

Die Verbindung läuft direkt zwischen den Browsern (WebRTC über [PeerJS](https://peerjs.com)). Der öffentliche PeerJS-Server vermittelt nur den ersten Kontakt. In manchen Firmen- oder Schulnetzen blockiert eine Firewall WebRTC, dann klappt das Duell dort nicht.

## Features

- **Chaos-Rad:** Alle paar Sekunden wird ein Ereignis ausgelöst, zum Beispiel Erdbeben, Lasergitter, zweite Sonne, Suchraketen, Glassäulen, Sturmböe, Mondfinsternis oder Farbchaos. Meistens ist es gemein, manchmal gut.
  - **Farbchaos:** Alle Farben geraten komplett durcheinander. Innenhof, Schatten, Säulen, Spielfigur, Gegner, Bosse, Anzeige und Karten bekommen jeweils einen eigenen, wild wechselnden Farbton, mehrmals pro Sekunde. Das wird mit jeder Stufe schlimmer: Auf Stufe 1 und 2 wechseln etwa 3-mal pro Sekunde nur manche Farben, ab Stufe 8 wechselt alles bis zu 12-mal pro Sekunde, dazu kommen invertierte Farben und vertauschte Farbkanäle. Das Ereignis ist rein optisch, Hitboxen und Regeln bleiben gleich. Wer unter Einstellungen **Grelle Blitze** ausschaltet, bekommt eine sanfte Version mit höchstens 2 bis 3 weichen Wechseln pro Sekunde und ohne Invertierung.
- **Vier Bosse:**
  - **Prisma** schießt drehende Laser in alle Richtungen.
  - **Käferkönigin** schießt Ringe aus Lichtkugeln und ruft Käfer.
  - **Sonnenstier** stürmt auf dich los und zerlegt Säulen. Nach dem Aufprall an der Wand ist er benommen, dann zählt ein Dash doppelt.
  - **Sonnenkern** kämpft in drei Phasen: erst Laser, dann Kugelringe, zum Schluss stürmt er los.
- **Dash:** Ein schneller Sprung, der dich kurz unverwundbar macht. Er ist die einzige Waffe gegen Bosse.
- **Über 40 gute und schlechte Sachen:** Schirm, Blasenschild, Schattenklon, Magnet, Portale, Frostkristall, dazu Fallen wie Umkehrpilz und Säuretropfen, Käfer, Sägeblätter, Laser und mehr. Die komplette Liste steht im Spiel unter **Anleitung → Lexikon**.
- **Sound und Musik:** Eigene Musik für Menü, Spiel und Bosskampf, die mit jeder Stufe schneller wird, und Geräusche für alles, was passiert. Alles wird live im Browser erzeugt, es gibt keine Audiodateien.
- **Zwei Sprachen:** Das Spiel startet auf Englisch. Unter Einstellungen → Sprache lässt es sich auf Deutsch umstellen. Die Wahl wird gespeichert.
- **Einstellungen:** Lautstärke für Musik und Effekte, Bildschirmwackeln, grelle Blitze abdämpfen, helles oder dunkles Design, Spielername, Fortschritt zurücksetzen.

## Steuerung

| Aktion | Tastatur | Maus | Handy |
| --- | --- | --- | --- |
| Laufen | WASD oder Pfeiltasten | Linke Taste gedrückt halten | Finger aufs Feld halten |
| Dash | Shift oder Leertaste (Laufrichtung) | Rechtsklick (Richtung Maus) | Dash-Knopf |
| Upgrade wählen | 1, 2, 3 | Karte anklicken | Karte antippen |
| Pause | Esc oder P | Pause-Knopf | Pause-Knopf |
| Ton an/aus | M | Lautsprecher-Knopf | Lautsprecher-Knopf |

## Tipps

- Dashe gegen den Sonnenstier, während er benommen an der Wand steht.
- Lock Suchraketen gegen eine Säule.
- Der Magnet zieht auch Fallen an, also Vorsicht in der Nähe von Säuretropfen.
- Hol Tau schnell hintereinander, dann steigt die Kombo bis ×5.
- Schattenspur und Zäher Schatten zusammen machen jeden Dash zu einem kleinen Schattenweg.

## Technik

- Reines HTML, CSS und JavaScript, gezeichnet auf einem `<canvas>`.
- Sound und Musik mit der Web Audio API, komplett synthetisch.
- Keine Bibliotheken für das Spiel selbst. Die Schriften kommen von Google Fonts, PeerJS wird erst geladen, wenn du ein Duell startest.
- Fortschritt, Punktekonto, Garderobe, Erfolge und Einstellungen werden im `localStorage` des Browsers gespeichert.
- Helles und dunkles Design folgen der Systemeinstellung oder deiner Wahl.

## Verwandt

[Kippwaage](https://github.com/sxrg1u/kippwaggen) ist ein zweites kleines Spiel aus derselben Reihe.
