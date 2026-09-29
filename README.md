# Kleine Browserspiele

Zwei Spiele, jedes in einer einzigen HTML-Datei. Zum Spielen die Datei im Browser öffnen, eine Installation ist nicht nötig.

## Schattenfänger (`schattenfaenger.html`)

Du steuerst ein kleines Schattenwesen über einen Innenhof. Die Sonne wandert im Kreis, die Schatten der Säulen wandern mit. Im Licht verlierst du Kraft, im Schatten lädst du auf.

- Chaos-Rad: Alle paar Sekunden wird ein zufälliges Ereignis ausgelöst (Erdbeben, Lasergitter, zweite Sonne, Mondfinsternis und mehr).
- Nach jeder Stufe kommt ein Boss: Prisma, Käferkönigin oder Sonnenstier. Nur ein Dash schadet ihm.
- Über 40 gute und schlechte Sachen. Die komplette Liste steht auf der Seite unter dem Spielfeld.

**Steuerung**

| Aktion | Taste |
| --- | --- |
| Laufen | WASD oder Pfeiltasten, oder linke Maustaste gedrückt halten |
| Dash | Rechtsklick (Richtung Maus), Shift oder Leertaste (Laufrichtung) |
| Neustart | Leertaste nach dem Spiel |

Mit „Boss üben“ auf dem Startbildschirm startest du direkt bei einem Boss.

## Kippwaage (`kippwaage.html`)

Gewichte fallen von oben. Schick jedes mit ← oder → auf die linke oder rechte Waagschale. Liegen die Schalen mehr als 15 kg auseinander, kippt die Waage. Ab 6 Punkten kommen Ballone, die ihre Schale nach oben ziehen.

## Technik

Reines HTML, CSS und JavaScript mit Canvas. Nur die Schriften werden von Google Fonts geladen. Der Rekord wird im `localStorage` des Browsers gespeichert.
