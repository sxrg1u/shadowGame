# Schattenfänger

**Ein chaotisches Browserspiel über Licht und Schatten.** Du bist ein kleines Schattenwesen auf einem sonnigen Innenhof. Die Sonne wandert im Kreis, und mit ihr wandert jeder Schatten. Bleib im Dunkeln, weich allem aus, was das Chaos-Rad dir entgegenwirft, und besiege nach jeder Stufe einen Boss.

## Spielen

1. `schattenfaenger.html` herunterladen oder das Repo klonen.
2. Die Datei per Doppelklick im Browser öffnen.

Es gibt nichts zu installieren. Das ganze Spiel steckt in dieser einen Datei.

## So funktioniert es

- **Licht kostet Kraft.** Im Sonnenlicht sinkt deine Kraftleiste schnell, im Schatten lädt sie langsam wieder auf. Bei null bist du verdampft.
- **Die Schatten wandern.** Die Sonne zieht im Kreis und wird mit jeder Stufe schneller. Die kleine Sonne am Rand zeigt, woher das Licht gerade kommt.
- **Stufen:** Alle 12 Sekunden steigt die Stufe. Eine Säule stürzt ein, eine neue wächst woanders, und danach kommt ein Boss.
- **Punkte:** 10 pro Sekunde, dazu Tau, Goldtau, Kombos und Boss-Siege.

## Features

- **Chaos-Rad:** Alle paar Sekunden wird ein Ereignis ausgelost, zum Beispiel Erdbeben, Lasergitter, zweite Sonne, Suchraketen, Glassäulen, Sturmböe oder Mondfinsternis. Meistens ist es gemein, manchmal gut.
- **Drei Bosse**, die sich abwechseln:
  - **Prisma** schießt drehende Laser in alle Richtungen.
  - **Käferkönigin** schießt Ringe aus Lichtkugeln und ruft Käfer.
  - **Sonnenstier** stürmt auf dich los und zerlegt Säulen. Nach dem Aufprall an der Wand ist er benommen, dann zählt ein Dash doppelt.
- **Dash:** Ein schneller Sprung, der dich kurz unverwundbar macht. Er ist die einzige Waffe gegen Bosse.
- **Über 40 gute und schlechte Sachen:** Schirm, Blasenschild, Schattenklon, Magnet, Portale, Frostkristall, dazu Fallen wie Umkehrpilz und Säuretropfen, Käfer, Sägeblätter, Laser und mehr. Die komplette Liste mit Symbolen steht im Spiel unter dem Spielfeld.
- **Säulen als Deckung:** Säulen werfen Schatten und halten außerdem Laser, Lichtkugeln und Raketen auf.
- **Letzte Kraft:** Unter 20 % Kraft läuft die Welt in Zeitlupe.
- **Boss üben:** Auf dem Startbildschirm kannst du direkt bei jedem Boss starten.

## Steuerung

| Aktion | Tastatur | Maus | Handy |
| --- | --- | --- | --- |
| Laufen | WASD oder Pfeiltasten | Linke Taste gedrückt halten | Finger aufs Feld halten |
| Dash | Shift oder Leertaste (Laufrichtung) | Rechtsklick (Richtung Maus) | Dash-Knopf |
| Neustart | Leertaste | Knopf „Nochmal“ | Knopf „Nochmal“ |

## Tipps

- Dashe gegen den Sonnenstier, während er benommen an der Wand steht.
- Lock Suchraketen gegen eine Säule.
- Der Magnet zieht auch Fallen an, also Vorsicht in der Nähe von Säuretropfen.
- Hol Tau schnell hintereinander, dann steigt die Kombo bis ×5.

## Technik

- Reines HTML, CSS und JavaScript, gezeichnet auf einem `<canvas>`.
- Keine Bibliotheken. Nur die Schriften kommen von Google Fonts.
- Der Rekord wird im `localStorage` des Browsers gespeichert.
- Helles und dunkles Design folgen der Systemeinstellung.

## Verwandt

[Kippwaage](https://github.com/sxrg1u/kippwaggen) ist ein zweites kleines Spiel aus derselben Reihe.
