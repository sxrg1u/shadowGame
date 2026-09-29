# Schattenfänger

Ein chaotisches Browserspiel in einer einzigen HTML-Datei. Zum Spielen `schattenfaenger.html` im Browser öffnen, eine Installation ist nicht nötig.

Du steuerst ein kleines Schattenwesen über einen Innenhof. Die Sonne wandert im Kreis, die Schatten der Säulen wandern mit. Im Licht verlierst du Kraft, im Schatten lädst du auf. Bei null Kraft bist du verdampft.

## Was im Spiel passiert

- **Chaos-Rad:** Alle paar Sekunden wird ein zufälliges Ereignis ausgelöst, zum Beispiel Erdbeben, Lasergitter, zweite Sonne, Suchraketen oder Mondfinsternis.
- **Bosse:** Nach jeder Stufe kommt ein Boss: Prisma, Käferkönigin oder Sonnenstier. Nur ein Dash schadet ihm. Nach 20 Sekunden zieht er ohne Belohnung wieder ab.
- **Über 40 gute und schlechte Sachen:** Schirm, Blasenschild, Schattenklon, Magnet, Portale, dazu Fallen, Käfer, Sägen, Laser und mehr. Die komplette Liste steht auf der Seite unter dem Spielfeld.
- **Letzte Kraft:** Unter 20 % Kraft läuft alles in Zeitlupe.

## Steuerung

| Aktion | Taste |
| --- | --- |
| Laufen | WASD oder Pfeiltasten, oder linke Maustaste gedrückt halten |
| Dash | Rechtsklick (Richtung Maus), Shift oder Leertaste (Laufrichtung) |
| Dash am Handy | Dash-Knopf unter dem Spielfeld |
| Neustart | Leertaste nach dem Spiel |

Mit „Boss üben“ auf dem Startbildschirm startest du direkt bei einem Boss.

## Technik

Reines HTML, CSS und JavaScript mit Canvas. Nur die Schriften werden von Google Fonts geladen. Der Rekord wird im `localStorage` des Browsers gespeichert.
