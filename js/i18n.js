'use strict';

// ---------- Sprachen ----------
// Der Quelltext ist deutsch. Englisch kommt aus diesen Tabellen (nach Kennung) und aus STATIC_EN (feste Texte im HTML).
// Objekte wie GOOD, RULES oder UPGRADES werden beim Sprachwechsel umgeschrieben, damit der restliche Code unverändert .name und .desc lesen kann.
const EN = {
  lex: {
    dew: ['Dew drop', 'Only lies in sunlight. 50 points times combo.'],
    gold: ['Golden dew', 'Rare. 200 points.'],
    umbrella: ['Umbrella', '5 s of your own shade. Also protects against bugs, glass, sparks and the lighthouse.'],
    crystal: ['Moonstone', 'Instantly +35 energy.'],
    hourglass: ['Hourglass', 'Everything runs in slow motion for 5 s.'],
    cloud: ['Cloud', 'Drifts across the yard, its shadow moves along.'],
    magnet: ['Magnet', 'For 6 s everything near you flies toward you. Traps too, sadly.'],
    boots: ['Turbo boots', 'Almost twice as fast for 5 s.'],
    bomb: ['Shadow bomb', 'Drops a big puddle of shade at your spot for 8 s.'],
    seed: ['Pillar seed', 'Instantly grows a new pillar, right between you and the sun.'],
    heart: ['Heart', 'An extra life, 2 at most (upgrades can raise this).'],
    star: ['Double star', 'Double points for 8 s.'],
    frost: ['Frost crystal', 'Freezes all enemies for 4 s, the boss too.'],
    shrink: ['Shrink potion', 'Tiny for 6 s. Harder to hit and fits into narrow shadows.'],
    thunder: ['Thunderclap', 'Destroys all bugs and magpies, 15 points each.'],
    portal: ['Portals', 'Two gates. Walk into one and come out of the other.'],
    eclipse: ['Eclipse', 'Chaos wheel: the whole yard is shade for 4 s.'],
    rain: ['Dew rain', 'Chaos wheel: suddenly 8 dew drops lie around.'],
    bubble: ['Bubble shield', 'Absorbs the next 3 hits: lasers, bugs, sparks, light orbs and bosses.'],
    dashy: ['Dash frenzy', 'Dash with almost no cooldown for 6 s.'],
    loot: ['Boss loot', 'Every defeated boss drops a heart or a moonstone plus a random extra.'],
    decoy: ['Shadow clone', 'A double for 6 s. Bugs, missiles and the burning glass chase it instead of you.'],
    spear: ['Shadow spear', 'Hits the boss for 2 damage right away. Without a boss it gives 100 points.'],
    spikes: ['Spike armor', 'For 6 s every touch destroys bugs and missiles and hurts bosses, even without a dash.'],
    clover: ['Lucky clover', 'The next 3 spins of the chaos wheel are good.'],
    lootrain: ['Loot rain', 'Chaos wheel: 3 random extras fall from the sky.'],
    bug: ['Light bug', 'Chases you. Costs 18 energy and pushes you away.'],
    hot: ['Hot tile', 'Flashes first, then burns even in the shade.'],
    lens: ['Burning glass', 'From level 2. A bright spot that follows you.'],
    noon: ['High noon', 'Chaos wheel: all shadows shrink for 4 s.'],
    crumble: ['Collapse', 'A pillar disappears at every level change.'],
    shroom: ['Reversal mushroom', 'Trap. Your controls are inverted for 5 s, dash too.'],
    acid: ['Acid drop', 'Trap that looks like dew. −25 energy and −100 points.'],
    honey: ['Honey puddle', 'Chaos wheel: sticky, you move at half speed.'],
    meteor: ['Solar sparks', 'Chaos wheel: red circles warn of the impact, then the ground burns.'],
    beam: ['Lighthouse', 'Chaos wheel: a light beam sweeps the yard and burns even in the shade.'],
    sun2: ['Second sun', 'Chaos wheel: two suns for 7 s. You are only safe where both shadows overlap.'],
    wind: ['Gale', 'Chaos wheel: the wind pushes you around for 4 s.'],
    swarm: ['Bug swarm', 'Chaos wheel: 5 bugs at once.'],
    quake: ['Earthquake', 'Chaos wheel: all pillars jump to new places.'],
    flash: ['Flashbang', 'Chaos wheel: for a moment everything is white and you can barely see.'],
    magpie: ['Magpie', 'Chaos wheel: steals dew and items. Touch it and it flies away (+30).'],
    lasergrid: ['Laser grid', 'Chaos wheel: dashed lines across the yard, lasers fire right after. −15 per hit.'],
    turret: ['Laser turret', 'Chaos wheel: a turret with a laser that spins in circles.'],
    shots: ['Light orbs', 'Bosses shoot orbs. −12 per hit, pillars block them.'],
    saw: ['Saw blades', 'Chaos wheel: two saws bounce off walls and pillars for 8 s. −15.'],
    missile: ['Homing missiles', 'Chaos wheel: they chase you in curves. −20. Lure them into a pillar or dash through.'],
    vortex: ['Light vortex', 'Chaos wheel: pulls you in for 5 s, out of your shade.'],
    glass: ['Glass pillars', 'Chaos wheel: half of the pillars turn transparent for 5 s and cast no shadow.'],
    prisma: ['Prisma', 'From level 2, then every 5 levels. Floats around the yard and fires spinning lasers in all directions.'],
    queen: ['Beetle Queen', 'From level 3, then every 5 levels. Circles the middle, fires rings of light orbs and summons bugs.'],
    bull: ['Sun Bull', 'From level 4, then every 5 levels. Aims with a red line and charges. Smashes pillars. After hitting the wall he is dazed, and a dash counts double.'],
    eater: ['Shadow Eater', 'From level 5. There is no shade inside his aura. He swallows the pillar closest to you and is full and sluggish afterwards: then a dash counts double.'],
    dusk: ['Nightmare', 'From level 6. Darkens the whole yard. The sun stops burning, but you can barely see, patches of light hunt you and he keeps jumping to new places.'],
    core: ['Sun Core', 'Final boss of the campaign on level 10, every 10 levels in Endless. Fights in three phases: lasers first, then orb rings, finally he charges.'],
  },
  rules: {
    traps: ['Traps only', 'Only traps show up. In return dew counts triple.'],
    twosun: ['Double sun', 'Two suns all the time. Where only one shadow falls, it burns half as hard.'],
    bugs: ['Bug plague', 'Three times as many bugs. Bugs you dash through give triple points.'],
    chaos: ['Pure chaos', 'The chaos wheel spins every 3 seconds.'],
    tiny: ['Tiny', 'You are tiny all the time, but everything else is faster.'],
    rush: ['Boss rush', 'Levels last only 6 seconds, bosses have one life less.'],
    mirror: ['Mirror world', 'Your controls are inverted all the time.'],
    glass: ['Glass cannon', 'No hearts and at most 60 energy. In return double points.'],
    dashfever: ['Dash fever', 'The dash recharges almost instantly, but the sun burns 30% harder.'],
    summer: ['High summer', 'Shadows are 35% shorter, dew gives twice as much energy.'],
    clouds: ['Cloudy day', 'Clouds keep drifting by, but the sun races.'],
    night: ['Moonlit night', 'Shadows are 40% longer. The burning glass chases you from the start, twice as fast.'],
  },
  ups: {
    dashcd: ['Quick dash', 'Your dash recharges 22% faster.'],
    trail: ['Shadow trail', 'Your dash leaves a trail of shade that lasts 3 s.'],
    linger: ['Lingering shade', 'Shadow bomb, trail and umbrella last 50% longer.'],
    longshadow: ['Long shadows', 'Pillars cast 20% longer shadows.'],
    heart: ['Extra heart', '+1 heart right away and one more heart slot.'],
    armor: ['Thick skin', 'Hits cost 20% less energy.'],
    cream: ['Sunscreen', 'Sunlight burns 15% less.'],
    feet: ['Nimble feet', 'You run 12% faster.'],
    regen: ['Shade bath', 'In the shade your energy recharges 50% faster.'],
    dewmag: ['Dew magnet', 'Dew near you flies to you on its own.'],
    heavy: ['Heavy dash', 'Dash hits deal 1 more damage to bosses.'],
    twin: ['Double dash', 'Two dash charges instead of one.'],
    longdash: ['Long jump', 'Your dash flies 30% farther.'],
    blade: ['Shadow blade', 'Your dash slices through light orbs and saw blades.'],
    shieldgen: ['Bubble spring', 'Every 20 s you get a bubble shield if you have none.'],
    combo: ['Combo master', 'The dew combo goes up to ×8 and lasts longer.'],
    greed: ['Gold rush', '+25% on all points.'],
    lucky: ['Lucky streak', 'The chaos wheel brings good things more often.'],
    phoenix: ['Phoenix', 'When a heart saves you, you get full energy and everything freezes for 2 s.'],
    architect: ['Architect', 'Instantly 2 new pillars, and no pillar collapses anymore.'],
  },
  ach: {
    first: ['First steps', 'Play your first run.'],
    bug10: ['Bug scare', 'Dash through 10 bugs.'],
    bug100: ['Exterminator', 'Dash through 100 bugs.'],
    clean: ['Untouched', 'Defeat a boss without being hit.'],
    prisma: ['Prism breaker', 'Defeat Prisma.'],
    queen: ['Regicide', 'Defeat the Beetle Queen.'],
    bull: ['Bullfighter', 'Defeat the Sun Bull.'],
    core: ['Solar eclipse', 'Defeat the Sun Core.'],
    campaign: ['Hero of the Yard', 'Win the campaign.'],
    hard: ['Indestructible', 'Win the campaign on Hard.'],
    boss25: ['Boss hunter', 'Defeat 25 bosses in total.'],
    spear: ['Spear throw', 'Finish a boss with the shadow spear.'],
    combo: ['Combo king', 'Reach a dew combo of ×5.'],
    dew100: ['Dew catcher', 'Collect 100 dew drops.'],
    survive: ['Tough shadow', 'Survive 3 minutes in one run.'],
    lvl15: ['Marathon', 'Reach level 15 in Endless mode.'],
    score10k: ['Point hunter', '10,000 points in one run.'],
    score30k: ['High score hero', '30,000 points in one run.'],
    rich: ['Treasure room', 'Collect 100,000 points in total.'],
    daily1: ["Day's work", 'Complete a daily challenge.'],
    streak3: ['Keep going', 'Complete the challenge 3 days in a row.'],
    missile10: ['Missile defense', 'Destroy 10 homing missiles.'],
    close: ['Close call', 'Drop below 3 energy and get back above 50.'],
    cards10: ['Card player', 'Pick 10 upgrades in total.'],
    build5: ['Fully equipped', 'Collect 5 upgrades in one run.'],
    fashion: ['Fashionista', 'Own 6 skins or hats.'],
    duel: ['Duelist', 'Win an online duel.'],
    traps: ['Bad luck', 'Step into 20 traps.'],
    tutorial: ['Quick learner', 'Finish the tutorial.'],
    eater: ['Fed up', 'Defeat the Shadow Eater.'],
    dusk: ['Daybreak', 'Defeat the Nightmare.'],
    allbosses: ['Boss slayer', 'Defeat each of the six bosses at least once.'],
    boss50: ['Boss destroyer', 'Defeat 50 bosses in total.'],
    explorer: ['Globetrotter', 'Play on all four maps.'],
    garden10: ['Gardener', 'Reach level 10 in the garden.'],
    roof10: ['Roofer', 'Reach level 10 on the rooftop.'],
    cellar10: ['Cellar dweller', 'Reach level 10 in the cellar.'],
    weekly1: ['Weekly hero', 'Complete a weekly challenge.'],
    weekly3: ['Regular', 'Complete three weekly challenges.'],
    lvl25: ['Tireless', 'Reach level 25 in Endless mode.'],
    trails5: ['Trailblazer', 'Own 5 trails.'],
  },
  skin: { schatten: 'Shadow', mitternacht: 'Midnight', pflaume: 'Plum', moos: 'Moss', tinte: 'Ink', glut: 'Ember', geist: 'Ghost', honig: 'Honey', stier: 'Bull blood', sternen: 'Stardust', regenbogen: 'Rainbow', gold: 'Golden shadow',
          tarn: 'Camouflage', eis: 'Ice', lava: 'Lava', nimmersatt: 'Glutton', nachtschatten: 'Nightshade', wochenheld: 'Weekly hero' },
  hat: { none: 'No hat', zylinder: 'Top hat', party: 'Party hat', bommel: 'Bobble hat', blume: 'Little flower', pirat: 'Pirate hat', propeller: 'Propeller cap', zauberer: 'Wizard hat',
         diadem: 'Prisma tiara', krone: 'Beetle crown', hoerner: 'Bull horns', heiligenschein: 'Halo', schlafmuetze: 'Nightcap', sonnenkrone: 'Sun crown',
         kochmuetze: 'Chef hat', cowboy: 'Cowboy hat', wikinger: 'Viking helmet', antennen: 'Antennae', mondsichel: 'Crescent moon', kerze: 'Candle hat', lorbeer: 'Laurel wreath' },
  trail: { none: 'No trail', funken: 'Sparks', blasen: 'Bubbles', herzen: 'Hearts', noten: 'Notes', sterne: 'Shooting star', regenbogen: 'Rainbow',
           echo: 'Shadow echo', blaetter: 'Leaves', feuer: 'Fire', mond: 'Moon dust' },
  req: { geist: 'Defeat Prisma 3×', honig: 'Defeat the Beetle Queen 3×', stier: 'Defeat the Sun Bull 3×', sternen: 'Win the campaign', gold: 'Defeat 25 bosses',
         diadem: 'Defeat Prisma', krone: 'Defeat the Beetle Queen', hoerner: 'Defeat the Sun Bull', heiligenschein: 'Defeat a boss without being hit', schlafmuetze: 'Complete 3 daily challenges', sonnenkrone: 'Defeat the Sun Core',
         nimmersatt: 'Defeat the Shadow Eater 3×', nachtschatten: 'Defeat the Nightmare 3×', wochenheld: 'Complete a weekly challenge',
         antennen: 'Dash through 50 bugs', mondsichel: 'Defeat the Shadow Eater', kerze: 'Defeat the Nightmare', lorbeer: 'Complete a weekly challenge' },
  treq: { echo: 'Finish the tutorial', blaetter: 'Reach level 6 in the garden', feuer: 'Defeat 10 bosses', mond: 'Defeat the Nightmare 2×' },
  diff: { easy: ['Easy', 'Sun and hits hurt less. 75% points.'], normal: ['Normal', 'How the game is meant to be played.'], hard: ['Hard', 'More heat, harder hits. 130% points.'] },
  rar: { c: 'Common', r: 'Rare', e: 'Epic' },
  ev: { 'Mittagssonne': 'High noon', 'Zweite Sonne': 'Second sun', 'Sturmböe': 'Gale', 'Käferschwarm': 'Bug swarm', 'Sonnenfunken': 'Solar sparks', 'Erdbeben': 'Earthquake', 'Blitzlicht': 'Flashbang',
        'Leuchtturm': 'Lighthouse', 'Elstern': 'Magpies', 'Honigregen': 'Honey rain', 'Lasergitter': 'Laser grid', 'Laserturm': 'Laser turret', 'Sägeblätter': 'Saw blades', 'Suchraketen': 'Homing missiles',
        'Lichtwirbel': 'Light vortex', 'Glassäulen': 'Glass pillars', 'Beuteregen': 'Loot rain', 'Mondfinsternis': 'Eclipse', 'Tauregen': 'Dew rain' },
};
const evLabel = k => (LANG === 'en' && EN.ev[k]) || k;
const bossLabel = type => { const e = BOSS_INFO.find(x => x[0] === type); return e ? e[1] : type; };

function applyDataLang() {
  const en = LANG === 'en';
  const swap = (o, nameKey, descKey, pair) => {
    if (!o._de) o._de = { n: o[nameKey], d: descKey ? o[descKey] : null };
    o[nameKey] = en && pair ? pair[0] : o._de.n;
    if (descKey) o[descKey] = en && pair ? pair[1] : o._de.d;
  };
  for (const list of [GOOD, BAD, BOSS_INFO]) for (const e of list) {
    if (!e._de) e._de = [e[1], e[2]];
    const x = EN.lex[e[0]];
    e[1] = en && x ? x[0] : e._de[0]; e[2] = en && x ? x[1] : e._de[1];
  }
  for (const r of RULES) swap(r, 'name', 'desc', EN.rules[r.id]);
  for (const u of UPGRADES) swap(u, 'name', 'desc', EN.ups[u.id]);
  for (const a of ACH) swap(a, 'name', 'desc', EN.ach[a.id]);
  for (const s of SKINS) {
    swap(s, 'name', null, EN.skin[s.id] && [EN.skin[s.id]]);
    if (s.req) { if (!s.req._de) s.req._de = s.req.text; s.req.text = en && EN.req[s.id] ? EN.req[s.id] : s.req._de; }
  }
  for (const h of HATS) {
    swap(h, 'name', null, EN.hat[h.id] && [EN.hat[h.id]]);
    if (h.req) { if (!h.req._de) h.req._de = h.req.text; h.req.text = en && EN.req[h.id] ? EN.req[h.id] : h.req._de; }
  }
  for (const t of TRAILS) {
    swap(t, 'name', null, EN.trail[t.id] && [EN.trail[t.id]]);
    if (t.req) { if (!t.req._de) t.req._de = t.req.text; t.req.text = en && EN.treq[t.id] ? EN.treq[t.id] : t.req._de; }
  }
  for (const k in DIFF) swap(DIFF[k], 'name', 'note', EN.diff[k]);
  for (const k in RARITY) { if (!RARITY[k]._de) RARITY[k]._de = RARITY[k][0]; RARITY[k][0] = en ? EN.rar[k] : RARITY[k]._de; }
  for (const b of BOSSES.concat([CORE])) { const x = EN.lex[b.type]; swap(b, 'name', null, x && [x[0]]); }
}

// Feste Texte im HTML: deutscher Text (getrimmt) -> englischer Text. Wird per Textknoten getauscht.
const STATIC_EN = {
  // Anzeige
  'Punkte': 'Score', 'Rekord': 'Best', 'Stufe': 'Level', 'Leben': 'Lives', 'Kraft': 'Energy', 'Gegner': 'Opponent', 'lebt': 'alive',
  'Pause': 'Pause', 'Spielfeld von Shady': 'Shady playfield',
  // Hauptmenü
  'Ein Spiel über Licht und Schatten': 'A game of light and shadow',
  'Du bist ein kleines Schattenwesen. Die Sonne wandert, das Chaos-Rad dreht sich, und nach jeder Stufe wartet ein Boss.': 'You are a little shadow creature. The sun keeps moving, the chaos wheel keeps spinning, and after every level a boss is waiting.',
  'Menü': 'Menu', 'Hauptmenü': 'Main menu', 'Spielen': 'Play', 'Kampagne · Endlos · Täglich': 'Campaign · Endless · Daily',
  'Mehrspieler': 'Multiplayer', 'Online-Duell': 'Online duel', 'Garderobe': 'Wardrobe', 'Skins & Hüte': 'Skins & hats',
  'Erfolge & Statistik': 'Achievements & stats', 'Einstellungen': 'Settings', 'Anleitung': 'How to play',
  'Punktekonto': 'Points balance', 'Heute': 'Today', 'Herausforderung starten': 'Start challenge',
  'Tipp:': 'Tip:', 'pausiert,': 'pauses,', 'schaltet den Ton': 'toggles sound',
  // Modusauswahl
  'Spielmodus wählen': 'Choose a game mode', 'Zurück': 'Back', 'Schwierigkeit': 'Difficulty', 'Leicht': 'Easy', 'Normal': 'Normal', 'Schwer': 'Hard',
  'Kampagne': 'Campaign', 'Endlos': 'Endless', 'Täglich': 'Daily',
  '10 Stufen und 9 Bosse. Am Ende wartet der Sonnenkern. Besieg ihn und du gewinnst.': '10 levels and 9 bosses. The Sun Core waits at the end. Defeat him and you win.',
  'Kein Ende. Jede Stufe wird härter, alle 10 Stufen kommt der Sonnenkern. Wie weit schaffst du es?': 'No end. Every level gets harder, and every 10 levels the Sun Core shows up. How far can you get?',
  'Boss üben': 'Practice boss', 'Käferkönigin': 'Beetle Queen', 'Sonnenstier': 'Sun Bull', 'Sonnenkern': 'Sun Core',
  'Schattenfresser': 'Shadow Eater', 'Nachtmahr': 'Nightmare', 'Woche': 'Week',
  'Karte für Kampagne, Endlos und Boss üben': 'Map for campaign, endless and boss practice',
  'Diese Woche': 'This week', 'Wochenherausforderung starten': 'Start weekly challenge',
  'Tutorial überspringen': 'Skip tutorial', 'Tutorial spielen': 'Play tutorial', 'Spuren': 'Trails', 'Skins, Hüte & Spuren': 'Skins, hats & trails',
  // Mehrspieler
  'Mehrspieler': 'Multiplayer',
  'Zwei Spieler, derselbe Innenhof. Ihr startet mit denselben Säulen, jeder in seiner eigenen Welt, und seht euch als Geist. Jeder besiegte Boss schickt dem anderen einen Angriff. Wer länger überlebt, gewinnt.': 'Two players, the same yard. You both start with the same pillars, each in your own world, and see each other as a ghost. Every defeated boss sends an attack to the other. Whoever survives longer wins.',
  'Dein Name': 'Your name', 'Raum erstellen': 'Create room', 'oder beitreten': 'or join', 'Raumcode': 'Room code', 'Beitreten': 'Join',
  'Einladungslink kopieren': 'Copy invite link', 'Duell starten': 'Start duel', 'Raum verlassen': 'Leave room',
  // Garderobe
  'Konto': 'Balance', 'Fahr über ein Teil, um es anzuprobieren.': 'Hover over an item to try it on.', 'Skins': 'Skins', 'Hüte': 'Hats',
  // Erfolge
  'Erfolge und Statistik': 'Achievements and stats', 'Erfolge': 'Achievements', 'Statistik': 'Stats', 'Bestenliste': 'Leaderboard',
  // Einstellungen
  'Musik': 'Music', 'Lautstärke der Hintergrundmusik': 'Background music volume', 'Effekte': 'Effects', 'Lautstärke der Geräusche': 'Sound effects volume',
  'Ton an': 'Sound on', 'Taste': 'Key', 'schaltet jederzeit um': 'toggles it at any time',
  'Bildschirmwackeln': 'Screen shake', 'Bei Treffern, Beben und Explosionen': 'On hits, quakes and explosions',
  'Grelle Blitze': 'Bright flashes', 'Aus: Blitzlicht und Donner werden abgedämpft': 'Off: flashbang and thunder are toned down',
  'Sprache': 'Language', 'Sprache des Spiels': 'Game language',
  'Design': 'Theme', 'Hell, dunkel oder wie dein System': 'Light, dark or like your system', 'System': 'System', 'Hell': 'Light', 'Dunkel': 'Dark',
  'Spielername': 'Player name', 'Für Duelle und die Bestenliste': 'For duels and the leaderboard',
  'Fortschritt zurücksetzen': 'Reset progress', 'Löscht Punkte, Erfolge, Statistik und Garderobe': 'Deletes points, achievements, stats and wardrobe', 'Zurücksetzen': 'Reset',
  // Anleitung
  'Anleitung und Lexikon': 'How to play and lexicon', 'Regeln': 'Rules', 'Lexikon': 'Lexicon',
  'Licht kostet Kraft.': 'Light costs energy.',
  'Im Sonnenlicht sinkt deine Kraftleiste schnell, im Schatten lädt sie langsam wieder auf. Bei null bist du verdampft, außer du hast noch ein Herz.': 'In sunlight your energy bar drops fast, in the shade it slowly recharges. At zero you evaporate, unless you still have a heart.',
  'Die Schatten wandern.': 'The shadows move.',
  'Die Sonne zieht im Kreis und wird mit jeder Stufe schneller. Die kleine Sonne am Rand zeigt, woher das Licht kommt.': 'The sun moves in a circle and gets faster with every level. The little sun at the edge shows where the light is coming from.',
  'Stufen und Bosse.': 'Levels and bosses.',
  'Alle 12 Sekunden steigt die Stufe, eine Säule stürzt ein und ein Boss erscheint. Nur ein Dash schadet ihm. Nach 20 Sekunden zieht er ohne Belohnung wieder ab.': 'Every 12 seconds the level goes up, a pillar collapses and a boss appears. Only a dash hurts him. After 20 seconds he leaves again without a reward.',
  'Upgrades.': 'Upgrades.',
  'Nach jedem besiegten Boss ziehst du drei Karten und nimmst eine. So spielt sich jede Runde anders.': 'After every defeated boss you draw three cards and pick one. That makes every run play differently.',
  'Chaos-Rad.': 'Chaos wheel.',
  'Alle paar Sekunden wird ein Ereignis ausgelost, meistens ein gemeines, manchmal ein gutes.': 'Every few seconds an event is drawn, mostly a nasty one, sometimes a good one.',
  'Punkte.': 'Points.',
  '10 pro Sekunde, dazu Tau, Kombos und Boss-Siege. Nach jeder Runde landen deine Punkte auf dem Konto. Damit kaufst du Skins und Hüte. Manche gibt es nur für Boss-Siege.': '10 per second, plus dew, combos and boss victories. After every run your points go to your balance. You use them to buy skins and hats. Some can only be earned by beating bosses.',
  'Letzte Kraft.': 'Last stand.',
  'Unter 20 % Kraft läuft die Welt in Zeitlupe, damit du noch einen Schatten erreichst.': 'Below 20% energy the world slows down so you can still reach a shadow.',
  'Laufen': 'Move', 'oder Pfeiltasten. Mit Maus oder Finger aufs Feld drücken und halten.': 'or arrow keys. Press and hold on the field with mouse or finger.',
  'oder': 'or', 'Leertaste': 'Space', 'in Laufrichtung, Rechtsklick in Richtung Maus, auf dem Handy der Dash-Knopf.': 'in walking direction, right-click toward the mouse, on mobile the Dash button.',
  'Upgrade': 'Upgrade', 'oder anklicken.': 'or click a card.',
  '. Ton an und aus mit': '. Sound on and off with',
  // Lexikon
  'Bosse': 'Bosses', 'nach jeder Stufe': 'after every level', 'Gut': 'Good', 'einsammeln': 'collect', 'Schlecht': 'Bad', 'ausweichen': 'dodge',
  // Pause, Upgrade, Ergebnis
  'Weiter': 'Resume', 'Aufgeben': 'Give up', 'Upgrade wählen': 'Choose an upgrade', 'Boss besiegt': 'Boss defeated', 'Wähl ein Upgrade': 'Choose an upgrade',
  'Ergebnis': 'Result', 'Verdampft': 'Evaporated', 'Nochmal': 'Again',
};
const origText = new WeakMap(), origAttr = new WeakMap();
const ATTRS = ['aria-label', 'placeholder', 'title'];
function translateStatic() {
  const en = LANG === 'en';
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes = []; let n;
  while ((n = w.nextNode())) { const p = n.parentNode && n.parentNode.nodeName; if (p !== 'SCRIPT' && p !== 'STYLE') nodes.push(n); }
  for (const node of nodes) {
    let de = origText.get(node);
    if (de === undefined) { if (!(node.nodeValue.trim() in STATIC_EN)) continue; de = node.nodeValue; origText.set(node, de); }
    const k = de.trim();
    node.nodeValue = en ? de.replace(k, STATIC_EN[k]) : de;
  }
  for (const el of document.body.querySelectorAll('[aria-label],[placeholder],[title]')) {
    let saved = origAttr.get(el);
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      if (!saved) { saved = {}; origAttr.set(el, saved); }
      if (saved[a] === undefined) { if (!(el.getAttribute(a) in STATIC_EN)) continue; saved[a] = el.getAttribute(a); }
      el.setAttribute(a, en ? STATIC_EN[saved[a]] : saved[a]);
    }
  }
}
