<p align="center">
  <img src="assets/og-image.png" alt="Titelbild von Stay Shady: das kleine Schattenwesen im Schatten einer Säule auf dem sonnigen Innenhof" width="720">
</p>

# Stay Shady

### [▶ Jetzt im Browser spielen](https://sxrg1u.github.io/shady/)

**Ein chaotisches Browserspiel über Licht und Schatten.** Du bist ein kleines Schattenwesen. Die Sonne wandert im Kreis, und mit ihr wandert jeder Schatten. Bleib im Dunkeln, weich allem aus, was das Chaos-Rad dir entgegenwirft, besiege nach jeder Stufe einen Boss und bau dir mit Upgrade-Karten deine eigene Runde.

Es gibt nichts zu installieren. Das Spiel läuft auf dem PC und auf dem Handy, auf Englisch oder Deutsch.

## Inhalt

- [Screenshots](#screenshots)
- [Spielen](#spielen)
- [So funktioniert es](#so-funktioniert-es)
- [Spielmodi](#spielmodi)
- [Karten](#karten)
- [Bosse](#bosse)
- [Chaos-Rad](#chaos-rad)
- [Upgrades nach jedem Boss](#upgrades-nach-jedem-boss)
- [Garderobe: Skins, Hüte und Spuren](#garderobe-skins-hüte-und-spuren)
- [Erfolge und Statistik](#erfolge-und-statistik)
- [Online-Duell](#online-duell)
- [Steuerung](#steuerung)
- [Einstellungen](#einstellungen)
- [Eigene Musik](#eigene-musik)
- [Tipps](#tipps)
- [Für Entwickler](#für-entwickler)

## Screenshots

| | |
| --- | --- |
| ![Hauptmenü von Stay Shady mit Logo, Menüknöpfen, täglicher Herausforderung und Wochenherausforderung](screenshots/hauptmenue.png) | ![Modusauswahl mit den vier Karten Innenhof, Garten, Dach und Keller sowie Kampagne, Endlos, Täglich und Woche](screenshots/modi.png) |
| *Das Hauptmenü* | *Modus und Karte wählen* |
| ![Normales Spiel auf Stufe 3: gelber Innenhof, dunkelblaue Schatten der Säulen, in der Mitte die kleine schwarze Spielfigur](screenshots/spiel-normal.png) | ![Garten: grüne Wiese mit Blumen, runde Bäume und Hecken werfen dunkelgrüne Schatten](screenshots/karte-garten.png) |
| *Innenhof: die erste Karte* | *Garten: runde Bäume, weiche Schatten* |
| ![Dach: orange Ziegel, Schornsteine mit Rauch, lange lila Schatten, oben rechts ein Pfeil für die Windrichtung](screenshots/karte-dach.png) | ![Keller: dunkler Raum, wandernde Fackeln werfen orange Lichtkreise, Säulen werfen Schatten von den Fackeln weg](screenshots/karte-keller.png) |
| *Dach: der Wind schiebt dich über die Ziegel* | *Keller: keine Sonne, nur Fackeln* |
| ![Bosskampf gegen den Schattenfresser: ein lila Wesen mit Zähnen, um ihn herum ein Kreis, in dem kein Schatten mehr liegt](screenshots/boss-schattenfresser.png) | ![Bosskampf gegen den Nachtmahr: der Garten ist fast schwarz, nur um die Spielfigur und um wandernde Lichtflecken ist etwas zu sehen](screenshots/boss-nachtmahr.png) |
| *Schattenfresser: frisst die Schatten um sich herum* | *Nachtmahr: macht alles dunkel* |
| ![Endkampf auf Stufe 10 gegen den Sonnenkern, eine wütende Sonne, die vier Laser über den Innenhof schießt](screenshots/boss-sonnenkern.png) | ![Garderobe mit Reitern für Skins, Hüte und Spuren und einer Vorschau der Spielfigur](screenshots/garderobe.png) |
| *Sonnenkern: der Endboss der Kampagne* | *Garderobe: Skins, Hüte und Spuren* |
| ![Liste der Erfolge mit Fortschrittsbalken, zum Beispiel Käferschreck, Bossjäger und Kombokönig](screenshots/erfolge.png) | ![Animation: Farbchaos auf Stufe 8 mit gedämpften Blitzen, die Farben gleiten weich ineinander](screenshots/farbchaos.gif) |
| *44 Erfolge, Statistik und Bestenliste* | *Farbchaos mit gedämpften Blitzen* |
| ![Farbchaos auf Stufe 2: ein Teil der Farben ist vertauscht, in der Mitte die Ankündigung „Chaos-Rad: Farbchaos“](screenshots/farbchaos-stufe-2.png) | ![Farbchaos auf Stufe 6: Hof, Schatten, Säulen und Anzeige in wild gemischten Farben](screenshots/farbchaos-stufe-6.png) |
| *Farbchaos auf Stufe 2: nur ein Teil der Farben kippt* | *Farbchaos auf Stufe 6: kaum noch etwas hat seine echte Farbe* |

<p align="center">
  <img src="screenshots/farbchaos-stufe-10-boss.png" alt="Farbchaos auf Stufe 10 im Kampf gegen den Sonnenkern: alle Farben sind vertauscht, bunte Laser kreuzen den Hof" width="420"><br>
  <em>Farbchaos auf Stufe 10 im Bosskampf gegen den Sonnenkern</em>
</p>

<p align="center">
  <img src="screenshots/boss-wut-spiegel.png" alt="Die wütende Käferkönigin mit rotem Schein schießt rote Glutkugeln. Die Spielfigur pariert mit dem Spiegel, eine lila Kugel fliegt zum Boss zurück, daneben liegt der Schattenanker." width="420"><br>
  <em>Wütende Käferkönigin: Spiegel pariert die gelben Kugeln, den roten Glutkugeln musst du ausweichen. Daneben der Schattenanker.</em>
</p>

Alle Bilder erzeugt [`tools/screenshots.mjs`](tools/screenshots.mjs) automatisch, siehe [Für Entwickler](#für-entwickler).

## Spielen

**Am einfachsten:** <https://sxrg1u.github.io/shady/> öffnen. Der Link funktioniert auch auf dem Handy und lässt sich teilen.

**Lokal:**

1. Das Repo klonen oder als ZIP herunterladen und entpacken.
2. `index.html` per Doppelklick im Browser öffnen.

Wichtig: `index.html` braucht die Ordner `css`, `js` und `assets` daneben. Die Datei allein reicht nicht mehr.

Beim ersten Klick auf **Spielen** startet ein kurzes **Tutorial** in zehn Schritten (laufen, Schatten suchen, Tau sammeln, dashen, Käfer wegdashen, Schattenanker, Spiegel, Boss treffen, Upgrade wählen). Du kannst es überspringen und später unter **Anleitung** noch einmal spielen. Wer es abschließt, bekommt die Spur „Schattenecho“.

## So funktioniert es

- **Licht kostet Kraft.** Im Licht sinkt deine Kraftleiste schnell, im Schatten lädt sie langsam wieder auf. Bei null bist du verdampft, außer ein Herz rettet dich.
- **Die Schatten wandern.** Die Sonne zieht im Kreis und wird mit jeder Stufe schneller. Die kleine Sonne am Rand zeigt, woher das Licht gerade kommt.
- **Stufen:** Alle 12 Sekunden steigt die Stufe. Eine Säule stürzt ein, eine neue wächst woanders, und danach kommt ein Boss.
- **Dash:** Ein schneller Sprung, der dich kurz unverwundbar macht. Er ist deine Hauptwaffe gegen Bosse.
- **Schattenanker (E):** Einmal drücken setzt einen Anker, nochmal drücken springt zu ihm zurück. Der Anker hält 8 Sekunden, danach lädt er 6 Sekunden. So kannst du kurz ins Licht laufen, Tau holen und zurück in den sicheren Schatten springen.
- **Spiegel (Q):** Eine Parade mit einem kleinen Zeitfenster. Drückst du genau vor einem Treffer, fliegen Lichtkugeln zum Boss zurück und machen Schaden. Laser, Sonnenfunken, Sägeblätter und Suchraketen prallen ab, und den Ansturm von Sonnenstier und Sonnenkern konterst du, sodass er benommen ist. Klappt die Parade, ist der Spiegel sofort wieder bereit. Drückst du daneben, dauert es 1,5 Sekunden.
- **Tau:** Tautropfen liegen immer im Licht. Sie geben Kraft und Punkte. Schnell hintereinander gesammelt steigt die Kombo bis ×5.
- **Punkte:** 10 pro Sekunde, dazu Tau, Goldtau, Kombos und Boss-Siege. Nach jeder Runde landen deine Punkte auf dem **Punktekonto**, mit dem du in der Garderobe einkaufst.

## Spielmodi

| Modus | Was dich erwartet |
| --- | --- |
| **Kampagne** | 10 Stufen, 9 Bosse. Am Ende wartet der Sonnenkern. Besiegst du ihn, hast du gewonnen. |
| **Endlos** | Kein Ende. Jede Stufe wird härter, alle 10 Stufen kommt der Sonnenkern. |
| **Tägliche Herausforderung** | Jeden Tag eine andere Regel und eine andere Karte, für alle gleich. Ziel: Stufe 6. Belohnung: 1 500 Punkte. Mehrere Tage hintereinander bauen eine Serie auf. |
| **Wochenherausforderung** | Jede Woche zwei Regeln gleichzeitig auf einer zufälligen Karte. Ziel: Stufe 10. Belohnung: 5 000 Punkte, beim ersten Mal dazu der Skin „Wochenheld“ und der Hut „Lorbeerkranz“, die es nirgends sonst gibt. |
| **Boss üben** | Direkt gegen einen Boss deiner Wahl. Dafür gibt es nur die halben Punkte aufs Konto. |
| **Online-Duell** | Zu zweit über das Internet, siehe [Online-Duell](#online-duell). |
| **Tutorial** | Die ruhige Übungsrunde vom ersten Start, jederzeit wiederholbar. |

Kampagne, Endlos und Boss üben gibt es auf **Leicht**, **Normal** und **Schwer** und auf jeder freigeschalteten Karte.

### Regeln für Tag und Woche

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

## Karten

Jede Karte ändert die Regeln ein wenig und hat eigene Farben und eigene Musik.

| Karte | Besonderheit | So schaltest du sie frei |
| --- | --- | --- |
| **Innenhof** | Die Sonne wandert im Kreis, eckige Säulen werfen lange Schatten. | Von Anfang an |
| **Garten** | Runde Bäume werfen weiche Schatten. Es gibt mehr Tau, aber die Käfer sind flinker. | Erreiche Stufe 4 |
| **Dach** | Der Wind schiebt dich ständig über die Ziegel. Viele Schornsteine, viele Wolken. | Besiege 5 Bosse |
| **Keller** | Keine Sonne, nur Fackeln, die quer durch den Raum wandern. Eine davon jagt dich. Ihr Licht brennt stärker, und im Schatten erholst du dich langsamer. | Besiege 12 Bosse |
| **Bahnhof** | Zwei Gleise queren den Bahnhof. Rote Gleise und ein Signal kündigen einen Zug an. Er fährt ein, hält ein paar Sekunden am Bahnsteig und wirft dabei einen langen Schatten, dann hupt er und fährt ab. Bahnsteigdächer spenden zusätzlich Schatten. Wer einem fahrenden Zug im Weg steht, bekommt Schaden (je nach Schwierigkeit) und wird weggeschleudert. | Stufe 6 auf dem Dach |
| **Schiffsdeck** | Das Schiff schaukelt, alle Schatten schwingen hin und her, und das Deck neigt sich. Links und rechts ist Wasser hinter der Reling. In der Mitte stehen drei Masten mit grossen Segeln und kleinen Topsegeln, die im Takt auf- und zugehen. | Stufe 6 im Bahnhof |
| **Wüste** | Kaum Schutz: Kakteen werfen dünne Schatten, Dünen wandern langsam. Ein Sandsturm macht alles zu Schatten, aber du siehst kaum etwas, und der Wind schiebt dich. | Stufe 6 auf dem Schiffsdeck |
| **Jahrmarkt** | Die Gondeln des Riesenrads werfen wandernde Schatten. Karussells drehen dich im Kreis. | Stufe 6 in der Wüste |
| **Stadt bei Nacht** | Dunkel und sicher, bis eine Laterne flackert und angeht. Autoscheinwerfer fegen über die Strasse, und Autos schubsen dich weg. | Stufe 6 auf dem Jahrmarkt |
| **Bibliothek** | Lange Regale werfen lange Schatten, der grosse Leuchter schwingt hin und her. Bücher fallen aus den Regalen und versperren Wege. | Stufe 6 in der Stadt |
| **Spiegelsaal** | Keine Sonne. Lichtwerfer an den Wänden schicken grelle Strahlen durch den Saal, die an schwenkenden Spiegeln abprallen und fast doppelt so stark brennen wie Sonnenlicht. Säulen halten die Strahlen auf. Auf höheren Stufen kommen mehr Strahlen dazu. | Stufe 6 in der Bibliothek |
| **Mond** | Geringe Schwerkraft: Du gleitest, und der Dash trägt fast doppelt so weit. Regelmässig geht die Erde auf und wirft ein zweites, bläuliches Licht, das halb so stark brennt. | Stufe 6 im Spiegelsaal |

Nach **Spielen** siehst du alle Karten auf einen Blick. Tipp eine an, dann wählst du Schwierigkeit und Modus. Jede gesperrte Karte kannst du statt mit der Bedingung auch mit Punkten aus dem Punktekonto freischalten (1.500 bis 15.000 Punkte).

Wer die Kampagne auf einer Karte gewinnt, bekommt dafür einen eigenen Skin und einen eigenen Hut, zum Beispiel Matrose und Kapitänsmütze auf dem Schiffsdeck oder Mondgestein und Raumhelm auf dem Mond.

Die tägliche und die wöchentliche Herausforderung dürfen jede Karte benutzen, auch wenn du sie noch nicht freigeschaltet hast.

## Bosse

Nach jeder Stufe kommt ein Boss. Ihn verletzen ein Dash oder eine Lichtkugel, die du mit dem Spiegel zurückschlägst.

| Boss | Was er tut |
| --- | --- |
| **Prisma** | Schießt drehende Laser in alle Richtungen. |
| **Käferkönigin** | Schießt Ringe aus Lichtkugeln und ruft Käfer. |
| **Sonnenstier** | Stürmt auf dich los und zerlegt Säulen. Nach dem Aufprall an der Wand ist er benommen, dann zählt ein Dash doppelt. |
| **Schattenfresser** | Frisst die Schatten in seinem Umkreis und verschlingt die Säule, die dir am nächsten ist. Danach ist er satt und träge. |
| **Nachtmahr** | Verdunkelt alles. Die Sonne brennt dann nicht mehr, dafür jagen dich Lichtflecken, und du siehst nur wenig. |
| **Sonnenkern** | Der Endboss. Kämpft in drei Phasen: erst Laser, dann Kugelringe, zum Schluss stürmt er los. |

**Wut-Phase:** Ab halben Leben wird jeder Boss außer dem Sonnenkern wütend. Er ist 35 % schneller, greift öfter an und feuert zusätzlich Fächer aus drei Glutkugeln auf dich. Der Sonnenstier schießt wütend beim Aufprall an der Wand einen Kugelring.

**Glutkugeln:** Rot umrandete Kugeln mit dunklem Kern. Der Spiegel wirkt nicht gegen sie, du musst ausweichen oder hindurchdashen. Käferkönigin, Schattenfresser, Nachtmahr und Sonnenkern mischen sie unter ihre normalen Lichtkugeln, du musst also blitzschnell entscheiden: parieren oder ausweichen.

**Anker-Jäger:** Läuft ein Boss über deinen Schattenanker, zertritt er ihn, und der Anker muss neu laden. Der Schattenfresser jagt den Anker gezielt und heilt sich um ein Leben, wenn er ihn frisst. Du kannst ihn so aber auch weglocken.

## Chaos-Rad

Alle paar Sekunden löst das Chaos-Rad eines von 20 Ereignissen aus. Meistens ist es gemein, manchmal gut:

Mittagssonne, Zweite Sonne, Sturmböe, Käferschwarm, Sonnenfunken, Erdbeben, Blitzlicht, Leuchtturm, Elstern, Honigregen, Lasergitter, Laserturm, Sägeblätter, Suchraketen, Lichtwirbel, Glassäulen, Farbchaos, Beuteregen, Mondfinsternis, Tauregen.

**Farbchaos** bringt alle Farben durcheinander: Boden, Schatten, Säulen, Spielfigur, Gegner, Bosse, Anzeige und Karten bekommen jeweils einen eigenen, wild wechselnden Farbton. Mit jeder Stufe wird es schlimmer. Auf Stufe 1 und 2 wechseln etwa dreimal pro Sekunde nur manche Farben, ab Stufe 8 wechselt alles bis zu zwölfmal pro Sekunde, dazu kommen invertierte Farben und vertauschte Farbkanäle. Das Ereignis ist rein optisch, Hitboxen und Regeln bleiben gleich. Wer unter Einstellungen **Grelle Blitze** ausschaltet, bekommt eine sanfte Version mit weichen Übergängen und ohne Invertierung.

Dazu kommen über 40 gute und schlechte Sachen, die auf dem Feld auftauchen: Schirm, Blasenschild, Schattenklon, Magnet, Portale, Frostkristall, Fallen wie Umkehrpilz und Säuretropfen und mehr. Die komplette Liste steht im Spiel unter **Anleitung → Lexikon**.

## Upgrades nach jedem Boss

Nach jedem besiegten Boss ziehst du drei Karten und nimmst eine. Karten sind gewöhnlich, selten oder episch, und viele lassen sich mehrfach stapeln. So spielt sich jede Runde anders.

Die 20 Karten: Schnelldash, Schattenspur, Zäher Schatten, Lange Schatten, Extraherz, Dicke Haut, Sonnencreme, Flinke Füße, Schattenbad, Taumagnet, Wuchtdash, Doppeldash, Weitsprung, Schattenklinge, Blasenquelle, Kombomeister, Goldgier, Glückspilz, Phönix, Baumeister.

## Garderobe: Skins, Hüte und Spuren

- **18 Skins**, von Mitternacht und Moos bis Regenbogen, Eis und Lava.
- **20 Hüte**, zum Beispiel Zylinder, Piratenhut, Wikingerhelm und Kochmütze.
- **10 Spuren**, die hinter deiner Figur herziehen: Funken, Blasen, Herzen, Noten, Sternschnuppe, Regenbogen, Schattenecho, Blätter, Feuer, Mondstaub.

Manche Teile kaufst du mit Punkten vom Konto. Andere gibt es nur für Leistungen:

| Teil | Bedingung |
| --- | --- |
| Prisma-Diadem, Käferkrone, Stierhörner, Mondsichel, Kerzenhut, Sonnenkrone | Den jeweiligen Boss einmal besiegen |
| Skins Geist, Honig, Stierblut, Nimmersatt, Nachtschatten | Den jeweiligen Boss dreimal besiegen |
| Heiligenschein | Einen Boss ohne Treffer besiegen |
| Skin Sternenstaub | Die Kampagne gewinnen |
| Skin Goldschatten | 25 Bosse besiegen |
| Schlafmütze | 3 tägliche Herausforderungen schaffen |
| Fühler | 50 Käfer wegdashen |
| Spur Schattenecho | Das Tutorial abschließen |
| Spur Blätter | Stufe 6 im Garten erreichen |
| Spur Feuer | 10 Bosse besiegen |
| Spur Mondstaub | Den Nachtmahr zweimal besiegen |
| Skin Wochenheld, Hut Lorbeerkranz | Eine Wochenherausforderung schaffen |

## Erfolge und Statistik

44 Erfolge wie „10 Käfer weggedasht“, „Boss ohne Treffer“, „Kombo ×5“ oder je einer für Garten, Dach und Keller. Dazu eine Statistik (Runden, Spielzeit, Bosse pro Typ, Dashes, Treffer und mehr) und eine Bestenliste mit den zehn besten Runden in Kampagne und Endlosmodus.

## Online-Duell

1. Einer klickt auf **Mehrspieler → Raum erstellen** und schickt den fünfstelligen Code oder den Einladungslink.
2. Der andere gibt den Code ein und klickt **Beitreten**, oder öffnet einfach den Link.
3. Der Gastgeber startet das Duell.

Beide starten auf derselben Karte mit demselben Zufall und sehen den anderen als Geist. Jeder besiegte Boss schickt dem Gegner einen Angriff (Käferschwarm, Suchraketen, Lasergitter und mehr), eine ×5-Kombo einen kleinen. Wer länger überlebt, gewinnt. Danach gibt es eine Revanche.

Die Verbindung läuft direkt zwischen den Browsern (WebRTC über [PeerJS](https://peerjs.com)). Der öffentliche PeerJS-Server vermittelt nur den ersten Kontakt. In manchen Firmen- oder Schulnetzen blockiert eine Firewall WebRTC, dann klappt das Duell dort nicht.

## Steuerung

| Aktion | Tastatur | Maus | Handy |
| --- | --- | --- | --- |
| Laufen | WASD oder Pfeiltasten | Linke Taste gedrückt halten | Finger aufs Feld halten |
| Dash | Shift oder Leertaste (Laufrichtung) | Rechtsklick (Richtung Maus) | Dash-Knopf |
| Schattenanker | E | | Anker-Knopf |
| Spiegel (Parade) | Q | | Spiegel-Knopf |
| Upgrade wählen | 1, 2, 3 | Karte anklicken | Karte antippen |
| Pause | Esc oder P | Pause-Knopf | Pause-Knopf |
| Ton an/aus | M | Lautsprecher-Knopf | Lautsprecher-Knopf |

## Einstellungen

- **Sprache:** Das Spiel startet auf Englisch und lässt sich auf Deutsch umstellen. Die Wahl wird gespeichert.
- **Lautstärke** getrennt für Musik und Effekte, dazu Stummschalten.
- **Bildschirmwackeln** an oder aus.
- **Vibration** bei Treffern, Paraden und Ankersprung (nur auf Geräten, die das können).
- **Grelle Blitze** abdämpfen, für empfindliche Augen.
- **Design:** hell, dunkel oder wie das System.
- **Spielername** für das Online-Duell.
- **Fortschritt zurücksetzen.**

Das Spiel folgt den Systemeinstellungen für **weniger Bewegung** (kurze Überblendungen statt Federn und Gleiten), **weniger Transparenz** (kein Weichzeichner, deckende Flächen) und **mehr Kontrast** (kräftigere Rahmen und Linien). Alle Schriftgrössen sind in `rem`, eine grössere Systemschrift vergrössert also auch das Spiel. Zustandsmeldungen wie „Pariert!“ werden zusätzlich für Screenreader angesagt.

Fortschritt, Punktekonto, Garderobe, Erfolge und Einstellungen liegen im `localStorage` deines Browsers. Sie bleiben also auf diesem Gerät und in diesem Browser.

## Eigene Musik

Die Musik entsteht live im Browser, mit eigenen Stücken für Menü, jede Karte, Bosskampf und Endboss. Sie wird mit jeder Stufe schneller.

Wer lieber echte Musikstücke hören will, legt sie in den Ordner [`assets/music`](assets/music) und trägt sie in `tracks.json` ein. Das Spiel spielt sie dann in Schleife ab. Alles Weitere, auch Quellen für freie Musik, steht in der [Anleitung im Musikordner](assets/music/README.md).

## Tipps

- Dashe gegen den Sonnenstier, während er benommen an der Wand steht.
- Halte Abstand zum Schattenfresser. In seinem Kreis schützt dich kein Schatten.
- Beim Nachtmahr brennt die Sonne nicht. Achte nur auf die Lichtflecken.
- Im Keller liegt der Schatten immer auf der Seite der Säule, die von der Fackel weg zeigt.
- Auf dem Dach zeigt der Pfeil oben rechts, wohin der Wind dich schiebt.
- Lock Suchraketen gegen eine Säule.
- Setz den Anker im Schatten, bevor du ins Licht läufst. Wird es eng, bist du mit einem Tastendruck zurück.
- Gegen die Käferkönigin lohnt sich der Spiegel: Jede zurückgeschlagene Kugel ist ein Treffer, ohne dass du nah ran musst. Aber Vorsicht vor den roten Glutkugeln.
- Der Magnet zieht auch Fallen an, also Vorsicht in der Nähe von Säuretropfen.
- Schattenspur und Zäher Schatten zusammen machen jeden Dash zu einem kleinen Schattenweg.

## Für Entwickler

### Technik

- Reines HTML, CSS und JavaScript, gezeichnet auf einem `<canvas>`. Kein Build-Schritt, kein Framework.
- Sound und Musik mit der Web Audio API.
- Keine Bibliotheken für das Spiel selbst. Die Schriften kommen von Google Fonts, PeerJS wird erst geladen, wenn du ein Duell startest.
- Alle Grafiken (Figur, Bosse, Symbole, Logo) werden im Code gezeichnet.

### Aufbau

```
index.html          Seite, Menüs, Angaben für Link-Vorschauen
css/style.css       Aussehen der Menüs und der Anzeige
js/art.js           Farben, Symbole, Figur, Skins, Hüte, Spuren
js/data.js          Profil, Schwierigkeit, Regeln, Upgrades, Erfolge, Debug-Start
js/audio.js         Geräusche und Musik
js/i18n.js          Englische Texte und Sprachumschaltung
js/maps.js          Die 12 Karten, Schatten und Licht
js/mapfx.js         Sonderregeln der neuen Karten (Züge, Segel, Laternen ...)
js/game.js          Spielablauf, Bosse, Chaos-Rad, Upgrades
js/draw.js          Zeichnen des Spielfelds, Farbchaos
js/tutorial.js      Tutorial
js/ui.js            Menüs, Eingabe, Online-Duell, Start
assets/             Symbol, Vorschaubild, itch.io-Titelbild, Musikordner
screenshots/        Bilder für diese README
tools/              Hilfsskripte (das Spiel braucht sie nicht)
```

Die Skripte sind normale `<script>`-Dateien ohne Module. Deshalb läuft das Spiel auch per Doppelklick.

### Hilfsskripte

Beide brauchen [Node.js](https://nodejs.org) und nutzen [Playwright](https://playwright.dev) mit dem installierten Edge oder Chrome.

```bash
cd tools
npm install
```

Screenshots für diese README neu erzeugen:

```bash
npm run screenshots
```

Das Tutorial automatisch mit echten Tastendrücken durchspielen und prüfen:

```bash
npm run tutorial-test
```

Bewegung Bild für Bild prüfen (Bildschirmwechsel, Hinweise, Upgrade-Karten, Anker, Dash und Spiegel bei verlangsamter Zeit). Die Bilder und ein Kontaktbogen landen in `tools/out/motion/`:

```bash
npm run motion-check                 # alle Szenarien, Faktor 0.1
npm run motion-check -- screens      # nur eines: screens, toast, cards, game
npm run motion-check -- --reduced    # mit „weniger Bewegung“
```

Das Spiel selbst läuft mit `?slow=0.25` auf einem Viertel der Geschwindigkeit.

### Debug-Start

Mit `?debug=1` startet das Spiel direkt in einer Runde mit festem Zufall und fester Bildrate. Die Figur ist unverwundbar, und es wird nichts gespeichert. Beispiel:

```
index.html?debug=1&lang=de&map=cellar&level=5&boss=eater&event=colorchaos&frames=300
```

| Angabe | Bedeutung |
| --- | --- |
| `map` | `yard`, `garden`, `roof`, `cellar` |
| `level`, `seed` | Stufe und Zufallszahl |
| `boss` | `prisma`, `queen`, `bull`, `eater`, `dusk`, `core` |
| `event` | Ereignis des Chaos-Rads, zum Beispiel `colorchaos` |
| `mode`, `diff` | `campaign` oder `endless`, `easy`, `normal` oder `hard` |
| `lang`, `flashes` | `de` oder `en`, `1` oder `0` |
| `frames` | Nach so vielen Bildern bleibt das Bild stehen |
| `screen` | `menu`, `modes`, `wardrobe`, `ach`, `help`, `settings` zeigt einen Menübildschirm statt einer Runde |
| `rage`, `anchor`, `parry` | `1`: Boss startet wütend (halbe Leben), Anker liegt schon, Figur pariert automatisch jede Lichtkugel |

### Veröffentlichen

- **GitHub Pages:** Jeder Push auf `main` aktualisiert <https://sxrg1u.github.io/shady/> nach ein bis zwei Minuten.
- **itch.io:** `index.html` zusammen mit den Ordnern `css`, `js` und `assets` als ZIP hochladen und „This file will be played in the browser“ anhaken. Als Titelbild passt `assets/cover.png`.
