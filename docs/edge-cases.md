# Edge-Case-Katalog — Test-Erstellung, -Laufzeit und -Änderung

> **Stand:** 28.08.2026 · **Commit:** `c4cfb809` · **Scope:** Test-Lebenszyklus über `ab-tool/app/api/`, `ab-tool/lib/`, `ab-tool/public/ab.js`, `ab-tool/app/dashboard/`, `db/migrations/`
> **Status:** 54 Fälle in 6 Gruppen — **8 kritisch**, 23 hoch, 19 mittel, 4 niedrig. Welle 1 ist umgesetzt (Branch `fix/test-integrity-wave-1`): RUN-03, RUN-05, WIN-02 und CREATE-03 behoben, EDIT-01 zur Hälfte. Der Status steht in der Tabelle jedes Abschnitts.
> **Auslöser:** die Frage, ob ein geändertes Variant-B-HTML automatisch übernommen wird und ob der Test danach überhaupt weiterlaufen darf. Die Antwort steht direkt unten; die Recherche dazu hat den Rest zutage gefördert.
> **Zeilennummern:** Stand 28.08.2026 auf Commit `2ab58606`, `public/ab.js` bei 1269 Zeilen. Die Belege in `public/ab.js` und `app/dashboard/` verschieben sich bei jeder Änderung — im Zweifel nach dem zitierten Code-Anker suchen, nicht nach der Zeile. Die Referenzen auf `app/api/` und `lib/significance.ts` sind stabiler.

## Die Ausgangsfrage, direkt beantwortet

**„Wird die neue HTML auto gechoosed?" — Teilweise. Und genau das ist der Fehler.**

Beim Speichern eines geänderten `variant_b_html` passiert dreierlei gleichzeitig:

1. **Neue Besucher** bekommen das neue HTML (nach bis zu 30 s Edge-Cache).
2. **Bereits gebucketete B-Besucher behalten dauerhaft das alte HTML.** `ab.js` cached nicht die Zuweisung, sondern das *gerenderte HTML* — unter dem Schlüssel `ab_<snippet_key>`, ohne Versions- oder Inhalts-Hash (`public/ab.js:1128`). Beim nächsten Seitenaufruf greift der Kurzschluss auf diesen Cache (`public/ab.js:1097`), bevor `/api/assign` überhaupt gefragt wird. Es gibt keinen Mechanismus, der diesen Eintrag jemals invalidiert.
3. **Beide Gruppen zählen in dieselben `conversions_b`.** Der B-Arm ist ab dem Edit ein Mischtopf aus zwei verschiedenen Varianten, und nichts im Produkt zeigt das an.

**„Sollte der Test überhaupt weitergeführt werden dürfen?" — Heute gibt es dazu keine Meinung im Code.**

`PATCH /api/tests/[id]` akzeptiert `variant_b_html`, `variant_b_css`, `selector`, `goal`, `site_url` und `traffic_split` auf einem `active` Test mit beliebig vielen Daten ohne jede Prüfung (`app/api/tests/[id]/route.ts:62`). Die einzige Ablehnung ist ein 422, wenn ein Pflichtfeld dadurch *leer* würde (`:50`). Es gibt **keine** Warnung, **keinen** Reset — weder in der API noch in der UI — und **kein** Event-Log für Änderungen (`log_event` feuert nur bei Statuswechseln, `:80`). Das alte HTML ist danach unwiederbringlich weg; das Schema kennt keine Revisionen.

**Verschärfend:** `evaluateWinner` misst die Mindestlaufzeit ab `created_at` (`lib/significance.ts:150`) — es gibt kein `started_at` und kein `restarted_at`. Ein drei Wochen alter, gestern editierter Test reißt die 7-Tage-Hürde also sofort, auf gemischten Daten. Und weil `auto_promote_winner` per Default `true` ist, kann der Cron danach `status='done'` setzen, woraufhin `/api/resolve` `force:'B'` liefert (`app/api/resolve/route.ts:168`) und **B auf 100 % der Live-Site des Kunden** geht.

**Empfehlung: warnen und Reset anbieten, nicht blockieren.** Siehe [Empfohlene Behandlung](#empfohlene-behandlung-für-gruppe-a) am Ende von Gruppe A.

## Das Muster hinter den meisten Fällen

Fast kein Fall in diesem Katalog erzeugt eine Fehlermeldung. Der Test läuft weiter und liefert eine Zahl, der der Kunde glaubt. Die drei häufigsten Formen:

- **Zählen ohne Rendern.** `/api/assign` wird aufgerufen, *bevor* feststeht, ob die Variante überhaupt dargestellt werden kann (`public/ab.js:1111` vs. `:971`). Ein Besucher kann in Arm B landen, ohne B je zu sehen.
- **Verschluckte Fehler.** Der Conversion-Listener fängt jeden `try`-Fehler stumm ab (`public/ab.js:619`) — ein syntaktisch ungültiger Goal-Selektor bedeutet dauerhaft null Conversions, ohne Hinweis.
- **Kein Zeitbegriff.** Das Schema hat genau einen Zeitstempel (`created_at`). Start, Neustart, Pause und Änderung sind nicht abbildbar, also rechnet die Statistik über alles hinweg.

Schweregrade: **Kritisch** = produziert still falsche Ergebnisse oder schadet der Kundenseite · **Hoch** = verfälscht Daten erkennbar · **Mittel** = Verwirrung oder Datenverlust im Einzelfall · **Niedrig** = kosmetisch oder selten.

---

## A · Änderungen an einem laufenden Test (EDIT)

| ID | Fall | Schwere | Status |
|---|---|---|---|
| EDIT-01 | Geändertes B-HTML → zwei Varianten in einem Arm | Kritisch | Teilweise behoben |
| EDIT-02 | Kein Guard, keine Warnung beim PATCH | Kritisch | Offen |
| EDIT-03 | Es gibt keine Reset-Funktion | Hoch | Offen |
| EDIT-04 | Kein Audit-Trail, keine Revisionen | Hoch | Offen |
| EDIT-05 | Selektor-Änderung bricht zusätzlich das Goal | Hoch | Offen |
| EDIT-06 | Goal-Änderung mitten im Test | Hoch | Offen |
| EDIT-07 | Traffic-Split-Änderung löst falschen SRM-Alarm aus | Mittel | Offen |
| EDIT-08 | site_url-Änderung entkoppelt Test von seinen Daten | Mittel | Offen |
| EDIT-09 | Zwei Seitentüren am Guard vorbei | Hoch | Offen |
| EDIT-10 | 30 s Edge-Cache nach dem Speichern | Niedrig | Offen |
| EDIT-11 | Wizard-Resume kann laufende Tests überschreiben | Mittel (latent) | Offen |

### EDIT-01 · Geändertes B-HTML → zwei Varianten in einem Arm · **Kritisch**

**Symptom.** Der Kunde bessert eine Formulierung in Variante B nach. Ab diesem Moment sehen zwei Gruppen unterschiedliche Seiten, deren Conversions in denselben Zähler laufen. Das Ergebnis misst weder die alte noch die neue Fassung, sondern eine unbekannte Mischung — mit einem Mischungsverhältnis, das von der Wiederkehrrate der Besucher abhängt und nirgends erfasst wird.

**Beleg.** `public/ab.js:1128` speichert `{variant, html, css, token}` unter `ab_<snippet_key>`. Der Schlüssel enthält nur die Test-ID, keinen Hash des Inhalts. `public/ab.js:1097` liest diesen Cache und kehrt bei Treffer sofort zurück, ohne die Daten aus `/api/resolve` zu berücksichtigen. Kein Code-Pfad löscht oder erneuert den Eintrag jemals.

**Behandlung. — Technische Hälfte behoben.** `/api/resolve` liefert die Variante jetzt mit einem Inhalts-Hash `v` aus (`lib/variantHash.ts`, nach der Sanitization gebildet). `ab.js` legt ihn im Cache-Eintrag ab und vergleicht ihn bei jedem Seitenaufruf. Weicht er ab, wird die **aktuelle** Fassung gerendert.

Bewusst *nicht* neu zugewiesen: der Besucher bleibt in seinem Arm. Ein zweites `/api/assign` hätte ihn erneut gezählt und ihn womöglich von B nach A geworfen — der Fix hätte dann DATA-01 verschlimmert, statt EDIT-01 zu lösen.

**Offen bleibt die statistische Hälfte:** Conversions aus der alten und der neuen Fassung liegen weiterhin im selben Zähler. Das lässt sich nicht im Client lösen, sondern nur über die Warnung samt Reset-Angebot beim Speichern (EDIT-02/EDIT-03).

### EDIT-02 · Kein Guard, keine Warnung beim PATCH · **Kritisch**

**Symptom.** Nichts hindert den Kunden daran, an einem Test mit 40 000 Besuchern den Selektor zu tauschen. Die UI zeigt weder eine Rückfrage noch den Hinweis, dass bereits Daten existieren; das Variant-B-Feld ist eine nackte Textarea mit Speichern-Button (`app/dashboard/results/[id]/ResultsClient.tsx`, `saveVariantB` ab `:269`, Editor-Block ab `:1197`).

**Beleg.** `app/api/tests/[id]/route.ts:62` — schlichtes `.update(patch)`. Die einzige inhaltliche Prüfung davor (`:50`) verhindert nur, dass ein aktiver Test *unvollständig* wird.

**Behandlung.** Siehe [Empfohlene Behandlung](#empfohlene-behandlung-für-gruppe-a).

### EDIT-03 · Es gibt keine Reset-Funktion · **Hoch**

**Symptom.** Selbst wer weiß, dass seine Daten jetzt verfälscht sind, kann nichts dagegen tun. Es gibt keinen Weg, die Zähler eines Tests zu nullen — der einzige Ausweg ist Löschen und Neuanlegen. Das erzeugt einen neuen `snippet_key`, zwingt den Kunden zum Neueinbau des Snippets auf seiner Website und löscht `events` und `daily_stats` per Kaskade mit.

**Beleg.** Kein Endpunkt, keine RPC, kein UI-Control. Die einzigen schreibenden Zugriffe auf die Zähler sind die inkrementierenden RPCs `ab_assign`/`ab_convert` (`db/migrations/001_schema.sql:47-84`) und die Signifikanz-Neuberechnung in `app/api/event/route.ts`.

**Behandlung.** `POST /api/tests/[id]/reset` — nullt `visitors_a/b`, `conversions_a/b`, `significance`, `winner`, setzt `restarted_at = now()`, schreibt ein Event und erhöht den Varianten-Hash aus EDIT-01, damit Client-Caches verfallen. `daily_stats` bleiben als Historie erhalten, werden aber ab dem Reset-Zeitpunkt getrennt ausgewiesen.

### EDIT-04 · Kein Audit-Trail, keine Revisionen · **Hoch**

**Symptom.** Ein Ergebnis lässt sich im Nachhinein nicht interpretieren, weil niemand rekonstruieren kann, was während der Laufzeit geändert wurde. Fällt einem Kunden zwei Wochen später auf, dass die Zahlen unplausibel sind, gibt es keine Möglichkeit, das mit einem Edit in Verbindung zu bringen — und die alte Variante ist überschrieben.

**Beleg.** `app/api/tests/[id]/route.ts:80` — `log_event` läuft nur, wenn sich `status` ändert. Das Schema kennt keine Revisions-Tabelle und keine Versionsspalte auf `tests`.

**Behandlung.** Event-Typen für semantische Änderungen ergänzen (`edited`, `reset`) inklusive der betroffenen Felder in `message`. Optional: die vorherige Variante in einer `test_revisions`-Tabelle behalten, damit ein „Zurück zur letzten Fassung" möglich wird.

### EDIT-05 · Selektor-Änderung bricht zusätzlich das Goal · **Hoch**

**Symptom.** Zusätzlich zum Mischtopf aus EDIT-01 rendern gecachte B-Besucher gegen den alten Selektor. Für den häufigsten Fall — Wizard-Tests, bei denen `goal === "click:" + selector` ist — verwendet `ab.js` als Goal-Selektor `[data-ab-el="<key>"]`, also das eingefügte Element selbst. Findet der Selektor nichts mehr, existiert dieses Element nie, und der B-Arm kann strukturell nicht konvertieren (siehe RUN-01).

**Behandlung.** Wie EDIT-02, plus: der Selektor sollte beim Speichern gegen die Live-Seite geprüft werden (siehe CREATE-02).

### EDIT-06 · Goal-Änderung mitten im Test · **Hoch**

**Symptom.** Vor und nach der Änderung wird etwas anderes gemessen — „Klick auf den Button" und „Klick auf den Warenkorb-Link" landen beide in `conversions_a/b`. Die Conversion-Rate ist danach ein gewichteter Durchschnitt zweier verschiedener Metriken.

**Behandlung.** Gehört zur semantischen Änderungsklasse in EDIT-02; ein Goal-Wechsel ist der Fall, bei dem der Reset am dringendsten der Default sein sollte.

### EDIT-07 · Traffic-Split-Änderung löst falschen SRM-Alarm aus · **Mittel**

**Symptom.** Wird der Split von 50/50 auf 80/20 geändert, vergleicht der Sample-Ratio-Mismatch-Check die *kumulativen* Besucherzahlen (die überwiegend aus der 50/50-Phase stammen) gegen den *neuen* Split. Der Test wird als datenkaputt gemeldet, obwohl nichts kaputt ist. Umgekehrt kann eine Änderung einen echten SRM maskieren.

**Beleg.** `lib/significance.ts:182` — `hasSampleRatioMismatch(vA, vB, trafficSplit)` kennt nur den aktuellen Split.

**Behandlung.** Split-Änderung als semantische Änderung behandeln (EDIT-02); ohne Reset den SRM-Check für diesen Test bis zum nächsten Reset aussetzen und stattdessen den Änderungshinweis anzeigen.

### EDIT-08 · site_url-Änderung entkoppelt Test von seinen Daten · **Mittel**

**Symptom.** `site_host` ist eine generierte Spalte aus `site_url`. Wird die URL geändert, verschwindet der Test schlagartig aus `/api/resolve` für die alte Domain und erscheint auf der neuen — mit den vollständigen Altdaten der alten Domain im Zähler.

**Beleg.** `app/api/resolve/route.ts:109` (`.eq('site_host', host)`), Spalte aus `db/migrations/021_resolve_scaling.sql`.

### EDIT-09 · Zwei Seitentüren am Guard vorbei · **Hoch**

**Symptom.** Selbst ein perfekter Guard im PATCH wäre wirkungslos, weil zwei andere Endpunkte dieselben Felder schreiben — ohne Statusprüfung:

- `app/api/generate/route.ts:219` setzt `variant_b_html` (bzw. `variant_b_css`) und schreibt es in `:224`. Der Kunde kann die Variante eines laufenden Tests per KI neu generieren lassen; die Zähler laufen weiter.
- `app/api/capture/route.ts:61` überschreibt `selector`, `original_html`, `site_css`, `framework`, `goal_candidates` und `reorder_selector` — der Element-Picker auf einem bestehenden Test.

**Behandlung.** Die Änderungsklassifikation und den Confirm-Guard in eine gemeinsame Helper-Funktion in `lib/` legen und aus allen drei Routen aufrufen, statt die Logik im PATCH zu isolieren.

### EDIT-10 · 30 s Edge-Cache nach dem Speichern · **Niedrig**

**Symptom.** Nach dem Speichern wird bis zu eine halbe Minute die alte Fassung ausgeliefert. Für den Kunden sieht es aus, als hätte das Speichern nicht funktioniert.

**Beleg.** `app/api/resolve/route.ts:181` — `Cache-Control: public, s-maxage=30`.

**Behandlung.** UI-Hinweis („Änderungen sind in bis zu 30 Sekunden live") genügt; der Cache selbst ist bewusst so gesetzt.

### EDIT-11 · Wizard-Resume kann laufende Tests überschreiben · **Mittel (latent)**

**Symptom.** Der Wizard PATCHt im Resume-Modus den *kompletten* Payload auf einen bestehenden Test — inklusive `status: 'active'` (`app/dashboard/components/NewTestDrawer.tsx:197`, Endpunkt-Auswahl `:329`). Heute ist dieser Pfad nur für Drafts verdrahtet, aber die API erzwingt das nicht. Eine UI-Änderung, die „Test bearbeiten" auf den Wizard legt, würde laufende Tests vollständig überschreiben.

**Behandlung.** Serverseitige Absicherung statt UI-Konvention: der Guard aus EDIT-02/09 fängt diesen Pfad automatisch mit ab.

### Empfohlene Behandlung für Gruppe A

Änderungen in zwei Klassen trennen:

- **kosmetisch** — `name`, `min_visitors`, `min_uplift`, `significance_level` (Auswertungsparameter; ändern die erhobenen Daten nicht)
- **semantisch** — `variant_b_html`, `variant_b_css`, `selector`, `goal`, `site_url`, `traffic_split`

Bei einer semantischen Änderung auf einem Test mit `status ∈ {active, paused}` **und** `visitors_a + visitors_b > 0` verlangt die API eine explizite Bestätigung (z. B. `?confirm=reset` / `?confirm=keep`), sonst 409. Die UI zeigt daraufhin:

> **X Besucher wurden bereits gezählt.**
> Diese Änderung verfälscht dein Ergebnis, weil die alte und die neue Fassung im selben Arm landen.
>
> `[Daten zurücksetzen und weiterlaufen]` (Default) · `[Ohne Reset speichern]` · `[Abbrechen]`

Der Reset nullt die Zähler, setzt `restarted_at`, schreibt ein Event und invalidiert die Client-Caches über den Varianten-Hash aus EDIT-01. Ohne Reset wird der Test markiert (`edited_during_run`), damit Ergebnis-Dashboard und Winner-Logik den Vorbehalt anzeigen können.

**Der Test wird in beiden Fällen nicht blockiert.** Die Entscheidung, mit verfälschten Daten weiterzumessen, bleibt beim Kunden — aber sie ist dann bewusst getroffen und dokumentiert.

---

## B · Auslieferung & Rendering (RUN)

| ID | Fall | Schwere | Status |
|---|---|---|---|
| RUN-01 | Selektor matcht nicht mehr → Test „beweist" A | Kritisch | Offen |
| RUN-02 | outerHTML-Fallback setzt kein data-ab-el | Hoch | Offen |
| RUN-03 | url:-Goals sind wählbar, aber nicht implementiert | Kritisch | Behoben |
| RUN-04 | Goal-Selektoren werden nie validiert | Hoch | Offen |
| RUN-05 | Anti-Flicker versteckt die Seite 10 s, wenn ab.js blockiert ist | Kritisch | Behoben (nur Neuinstallationen) |
| RUN-06 | Origin-Erkennung bricht still | Hoch | Offen |
| RUN-07 | Spät ladende Elemente zeigen erst A, dann B | Mittel | Offen |
| RUN-08 | SPA: ungedrosseltes popstate, Blindfenster ohne Tracking | Mittel | Offen |
| RUN-09 | Bridge-Modus verschiebt :nth-child der Geschwister | Mittel | Offen |
| RUN-10 | Plain-Text-Pfad zerstört Kind-Markup | Mittel | Offen |
| RUN-11 | Subdomains matchen nie | Mittel | Offen |
| RUN-12 | Test ohne generiertes B zählt alle 5 s einen Besucher | Hoch | Offen |
| RUN-13 | Sanitizer-Ausfall zeigt A, zählt aber B | Mittel | Offen |

### RUN-01 · Selektor matcht nicht mehr → der Test „beweist" A · **Kritisch**

**Symptom.** Der häufigste reale Defekt überhaupt: Der Kunde macht ein CMS-Update, tauscht ein Theme oder benennt eine Klasse um. Der Selektor findet nichts mehr. Was dann passiert, ist schlimmer als ein Ausfall — es ist ein *falsches Ergebnis*:

1. `/api/assign` läuft, bevor irgendjemand geprüft hat, ob das Element existiert. Der Besucher wird in Arm B gezählt.
2. `applyDom` findet nichts und bricht ab.
3. Der Goal-Selektor bleibt trotzdem `[data-ab-el="<key>"]` — ein Element, das nie in die Seite kam.
4. **Arm B sammelt also Besucher, kann aber strukturell null Conversions haben.** Arm A funktioniert normal. Der Test „beweist" mit wachsender Signifikanz, dass A gewinnt.

Nichts meldet das: kein Beacon bei fehlgeschlagenem Apply, kein Health-Check, der prüft, ob der Selektor auf der Live-Seite noch auflöst. `compute_test_health` prüft ausschließlich, ob Felder *nicht leer* sind.

**Beleg.** `public/ab.js:1111` (assign) vs. `public/ab.js:971` (`document.querySelector(selector)`, `if (!el) return false`).

**Behandlung.** Zwei Ebenen. Kurzfristig: bei fehlgeschlagenem Apply einen Fehler-Beacon senden und den Test im Dashboard als „Variante wird nicht ausgeliefert" markieren; solange das der Fall ist, dürfen `visitors_b` nicht steigen. Sauberer: die Zuweisung erst zählen, wenn das Rendern erfolgreich war — das löst zugleich DATA-12.

### RUN-02 · outerHTML-Fallback setzt kein data-ab-el · **Hoch**

**Symptom.** Hat das generierte Fragment kein einzelnes Wurzelelement, greift der Fallback `el.outerHTML = html` (`public/ab.js:1020`). Dieser Pfad markiert das Ergebnis nicht mit `data-ab-el`. Folge: Der Idempotenz-Guard erkennt die Variante beim nächsten Durchlauf nicht (Doppel-Anwendung möglich), und das Goal `[data-ab-el]` findet nichts — dieselbe strukturelle Null wie RUN-01.

**Behandlung.** Nach dem Fallback das eingefügte Element wiederfinden und markieren, oder das Fragment serverseitig immer in ein Wurzelelement wickeln.

### RUN-03 · url:-Goals sind wählbar, aber nicht implementiert · **Kritisch**

**Symptom.** Das Dashboard bietet drei Goal-Typen an: Element, Klick-Selektor und **URL**. `ab.js` kennt nur die ersten beiden. `normGoal` (`public/ab.js:568`) entfernt lediglich ein `click:`-Präfix und gibt alles andere unverändert zurück — `"url:/danke"` landet als CSS-Selektor in `e.target.closest()`, wirft einen `SyntaxError`, und der wird vom umschließenden `try/catch` verschluckt (`public/ab.js:619`).

**Ergebnis: null Conversions auf beiden Armen, dauerhaft, ohne jeden Hinweis.** Der Kunde wählt eine im Produkt angebotene Option und bekommt einen Test, der niemals etwas messen kann.

**Behandlung. — Behoben.** Die Option ist aus dem Goal-Editor entfernt, `goalString` (`lib/validation.ts`) und `/api/capture` lehnen `url:`-Goals ab, und `normGoal` in `ab.js` gibt bei `url:` ein leeres Goal zurück statt eines kaputten Selektors — samt Konsolenmeldung. Die `url:`-Sperre prüft bewusst nur dieses eine bekannte Präfix: eine generische Regel über „alles vor einem Doppelpunkt" hätte legitime Pseudoklassen wie `a:hover` mitgerissen.

Bestandstests mit `url:`-Goal behalten ihren Wert und zeigen im Dashboard eine Warnung, dass für sie nie Conversions erfasst wurden. Implementiert wird der Zieltyp erst, wenn er tragfähig ist: URL-Goals brauchen seitenübergreifende Zuordnung, und die ist im cookielosen Default (DATA-01) gar nicht vorhanden.

### RUN-04 · Goal-Selektoren werden nie validiert · **Hoch**

**Symptom.** Die Validierung prüft nur, dass das Goal nicht der Leerstring `click`/`click:` ist und höchstens 256 Zeichen hat. Ob der Selektor syntaktisch gültig ist, wird nie getestet; ob er auf der Zielseite überhaupt existiert, erst recht nicht. Jeder Tippfehler führt zum stillen Totalausfall aus RUN-03. Der bestehende Test `__tests__/fix-goal.mjs` existiert genau deshalb — ein Kunde ist bereits in die `goal="click"`-Variante dieses Problems gelaufen.

**Behandlung.** `document.querySelector(sel)` in einem `try` beim Speichern (serverseitig via jsdom oder clientseitig vor dem PATCH) und Ablehnung mit klarer Meldung.

### RUN-05 · Anti-Flicker versteckt die Seite 10 s, wenn ab.js blockiert ist · **Kritisch**

**Symptom.** Das Snippet setzt `html.__ab_pending { opacity: 0 !important }` und wartet darauf, dass `ab.js` `window.__ab_pending_resolve` setzt (`public/ab.js:470`). Wird `ab.js` nie geladen — Adblocker, restriktive CSP, Netzfehler, Ausfall — setzt das niemand, und die Seite des Kunden bleibt bis zum Sicherheits-Timeout **10 Sekunden lang unsichtbar**. Der 5-Sekunden-Fetch-Timeout hilft nur, wenn `ab.js` überhaupt lief.

Das ist der einzige Fall im Katalog, der nicht die Messung, sondern die Website des Kunden direkt schädigt.

**Behandlung. — Behoben für Neuinstallationen.** Das Sicherheits-Timeout im Inline-Snippet steht jetzt auf 3 s statt 10 s (`lib/snippetCode.ts`). Der Normalfall läuft ohnehin über den Poller, der die Seite freigibt, sobald `ab.js` aufgelöst hat; das Timeout greift nur, wenn `ab.js` nie lädt.

**Bestandsinstallationen behalten ihre 10 s**, weil das Snippet fest im `<head>` der Kundenseite steht — sie profitieren erst, wenn der Kunde es neu kopiert. Wer die Altfassung erreichen will, kommt an `/api/snippet-check` nicht vorbei, das veraltete Installationen ohnehin schon meldet.

### RUN-06 · Origin-Erkennung bricht still · **Hoch**

**Symptom.** `ab.js` ermittelt seine API-Basis, indem es rückwärts nach einem `<script src>` sucht, dessen URL auf `/ab.js` endet (`public/ab.js:15`). Ohne Treffer wird stillschweigend abgebrochen (`public/ab.js:476`). Das trifft: GTM-Custom-HTML-Tags mit inline eingefügtem Code, Bundler, die `ab.js` mitkompilieren, Umbenennungen auf `ab.min.js`, Cloudflare Rocket Loader — und Self-Hosting. Wer das Skript zur CSP-Umgehung von der eigenen Domain ausliefert, bekommt sogar eine *falsche* Origin: alle API-Aufrufe gehen dann gegen die Kundendomain und laufen ins Leere.

In allen Fällen: keine Konsolenmeldung, keine Telemetrie, kein Hinweis im Dashboard. Der Test steht auf „aktiv" und sammelt nie Daten.

**Behandlung.** Die Origin beim Snippet-Bau fest einbacken statt sie zur Laufzeit zu erraten; als Fallback eine `console.warn` und ein Dashboard-Hinweis „Snippet gefunden, aber keine Daten empfangen" (`/api/snippet-check` erfasst das bereits teilweise).

### RUN-07 · Spät ladende Elemente zeigen erst A, dann B · **Mittel**

**Symptom.** Existiert das Zielelement beim ersten Durchlauf noch nicht (Lazy Loading, Consent-Layer, clientseitig gerendertes Widget), schlägt das Apply fehl, die Seite wird mit **A** sichtbar gemacht, und der Besucher ist bereits als B gezählt. Erst wenn der MutationObserver anschlägt, poppt B nach — nach bis zu 500 ms Debounce plus bis zu 5 s Mindestintervall. Der Besucher sieht das Umspringen.

**Behandlung.** Kurzes gezieltes Polling auf den Selektor (z. B. 2 s) vor dem Reveal, statt allein auf den Observer zu warten.

### RUN-08 · SPA: ungedrosseltes popstate, Blindfenster ohne Tracking · **Mittel**

**Symptom.** `popstate` ruft `reobserve()` ohne Debounce auf (`public/ab.js:1226`), anders als der Observer-Pfad. `reobserve()` setzt `active = []` und startet `run()` neu, inklusive vollem `/api/resolve`-Roundtrip. Zwischen dem Zurücksetzen und der Antwort werden **keine Conversions getrackt** — auf einer schnell navigierten SPA ein wiederkehrendes Loch. Zusätzlich wächst `active` bei überlappenden Läufen.

**Behandlung.** `popstate` an dieselbe Drosselung hängen und die letzte `resolve`-Antwort für kurze Zeit wiederverwenden, statt bei jeder Navigation neu zu laden.

### RUN-09 · Bridge-Modus verschiebt :nth-child der Geschwister · **Mittel**

**Symptom.** Kann eine Interaktion nicht sauber portiert werden, fügt `ab.js` B *vor* A ein und versteckt A per `display:none`. A bleibt damit im DOM — was für delegierte Event-Handler richtig ist, aber alle `:nth-child`-, `:first-child`- und `:last-child`-Regeln der Geschwister um eins verschiebt. In Grid- und Flex-Listen mit Positionsregeln bricht das Layout sichtbar. Der Code weist im Kommentar selbst darauf hin.

**Behandlung.** Dokumentieren und im Test-Preview sichtbar machen; eine allgemeine Lösung gibt es nicht, solange A im DOM bleiben muss.

### RUN-10 · Plain-Text-Pfad zerstört Kind-Markup · **Mittel**

**Symptom.** Enthält das neue HTML kein `<tag`, wird es als reiner Text behandelt und per `textContent` gesetzt. Das erhält zwar `href` und Event-Listener, löscht aber alle Kindelemente — Icons, `<span>`-Wrapper, Badges im Button verschwinden. Für eine reine Textänderung an einem schlichten Button ist das korrekt; bei zusammengesetzten Buttons ist es ein sichtbarer Defekt.

**Behandlung.** Nur den ersten Textknoten ersetzen statt `textContent` komplett zu überschreiben, wenn das Element Kindelemente hat.

### RUN-11 · Subdomains matchen nie · **Mittel**

**Symptom.** `hostOf` normalisiert lediglich `www.` weg. Ein Test für `example.com` läuft daher nicht auf `shop.example.com`, `app.example.com` oder `m.example.com` — und das ohne Fehlermeldung; der Kunde baut das Snippet ein und wundert sich, dass nichts passiert. Mehrere Länderdomains derselben Marke brauchen separate Tests mit getrennten Zählern, die sich nicht zusammenführen lassen.

**Behandlung.** Optionales Subdomain-Matching pro Test (`include_subdomains`), da die Zusammenführung der Zähler ohnehin fachlich fragwürdig wäre.

### RUN-12 · Test ohne generiertes B zählt alle 5 s einen Besucher · **Hoch**

**Symptom.** Liefert `resolve` einen Test ohne `variant_b_html`, ruft `ab.js` trotzdem `/api/assign` auf (der Besucher wird gezählt), zeigt A und cached die Zuweisung **absichtlich nicht**, damit ein späterer Aufruf das inzwischen generierte HTML aufnehmen kann (`public/ab.js:1131`). Auf jeder Seite, die überhaupt mutiert — Lazy Loading, Karussell, Chat-Widget — feuert der Observer alle 5 s, und jeder Durchlauf erzeugt einen neuen gezählten „Besucher". Ein einzelner Besucher, der zehn Minuten auf der Seite bleibt, kann so über hundert Besucher erzeugen.

**Behandlung.** Tests ohne generierte Variante gar nicht erst ausliefern (siehe LIFE-01) — dann entfällt der Fall vollständig.

### RUN-13 · Sanitizer-Ausfall zeigt A, zählt aber B · **Mittel**

**Symptom.** Scheitert der dynamische Import des Sanitizers, liefert `/api/resolve` die Tests weiterhin aus, aber mit `variant_b_html: null`. Sicherheitstechnisch ist das korrekt (fail-closed), datentechnisch bedeutet es: alle Besucher sehen A, die Hälfte wird als B gezählt. Der bestehende Test `__tests__/sanitize-runtime.mjs` schützt vor der Ausfallursache, nicht vor der Datenfolge.

**Behandlung.** Bei fehlendem Sanitizer den Test aus der `resolve`-Antwort ganz weglassen, statt ihn ohne Variante auszuliefern.

---

## C · Zählung & Datenqualität (DATA)

| ID | Fall | Schwere | Status |
|---|---|---|---|
| DATA-01 | Default ist cookielos → keine Stickiness, Doppelzählung | Kritisch | Offen |
| DATA-02 | Kein Bot-Filter, nirgends | Hoch | Offen |
| DATA-03 | Keine QA-/Selbstbesuch-Ausnahme | Hoch | Offen |
| DATA-04 | /api/assign ist ein ungeschützter Zähler-GET | Hoch | Offen |
| DATA-05 | Conversions ohne Token werden akzeptiert | Hoch | Offen |
| DATA-06 | Token-TTL 30 min → legitime späte Conversion verloren | Mittel | Offen |
| DATA-07 | Replay-Schutz ist fail-open | Mittel | Offen |
| DATA-08 | Rate-Limits pro IP treffen Büros und CGNAT | Mittel | Offen |
| DATA-09 | Inkognito, Storage-Clear, Safari-ITP | Hoch | Offen |
| DATA-10 | Cross-Device und Cross-Domain ohne Identität | Mittel | Offen |
| DATA-11 | 409 auf paused/done verwirft Conversion still | Niedrig | Offen |
| DATA-12 | Es gibt keine Impressions | Hoch | Offen |

### DATA-01 · Der Default ist cookielos, also nicht sticky · **Kritisch**

**Symptom.** Ohne `window.varianteConsent === true` schreiben `lsSet`/`convSet` in ein reines In-Memory-Objekt (`public/ab.js:523`), das mit dem Seitenaufruf stirbt. Das ist der **Auslieferungszustand** — nichts im Produkt, in der Doku oder im Snippet-Dialog weist den Kunden darauf hin, dass er dieses Flag setzen sollte. Folgen:

- **Jeder harte Seitenaufruf erzeugt eine neue Zuweisung** und damit einen neuen gezählten „Besucher".
- **Die Variante kann zwischen Seitenaufrufen wechseln** — derselbe Mensch sieht A, dann B, dann wieder A.
- **„Visitors" ist faktisch ein Pageview-Zähler**, Conversions sind aber pro Session dedupliziert. Der Nenner der Conversion-Rate ist damit systematisch aufgebläht — und *ungleich* zwischen den Armen, weil er davon abhängt, wie viele Seiten die Besucher jedes Arms ansehen.

Innerhalb eines Seitenaufrufs bleibt die Zuweisung stabil (SPA-Navigation, Observer-Läufe), das Problem tritt also genau bei harten Navigationen und Reloads auf.

**Behandlung.** Das ist die Grundsatzentscheidung hinter fast allen Zahlen im Produkt und sollte bewusst getroffen werden: entweder Stickiness ohne Consent über ein technisch notwendiges First-Party-Cookie (rechtlich vertretbar, da für die Funktion erforderlich), oder — solange es beim cookielosen Default bleibt — die Zählung auf tatsächlich unterscheidbare Einheiten umstellen und im Dashboard klar „Seitenaufrufe" statt „Besucher" schreiben.

### DATA-02 · Kein Bot-Filter, nirgends · **Hoch**

**Symptom.** Es gibt keinerlei User-Agent-, Crawler- oder Headless-Erkennung — weder in `ab.js` noch in einer API-Route. Suchmaschinen-Crawler, Uptime-Monitore, Screenshot- und Link-Preview-Dienste führen zunehmend JavaScript aus und werden voll als Besucher gezählt. Der SRM-Check schlägt nur an, wenn Bots das *Verhältnis* verzerren — verteilen sie sich gleichmäßig, verwässern sie beide Arme unbemerkt und drücken die Conversion-Rate.

**Behandlung.** Mindestens eine User-Agent-Blockliste in `/api/assign` und `/api/event`; zusätzlich `navigator.webdriver` clientseitig prüfen.

### DATA-03 · Keine QA-/Selbstbesuch-Ausnahme · **Hoch**

**Symptom.** Die Besuche des Testerstellers zählen mit. Genau das passiert am Anfang jedes Tests systematisch: Der Kunde legt den Test an, ruft seine Seite mehrfach auf, prüft beide Varianten, zeigt sie einem Kollegen. Bei kleinen Seiten sind das leicht die ersten fünf Prozent der Daten — und sie konvertieren anders als echte Besucher.

**Behandlung.** Ein `?ab_qa=1`-Parameter, der ein dauerhaftes Ausschluss-Flag setzt, plus ein Hinweis im Dashboard („Deine eigenen Besuche ausschließen").

### DATA-04 · /api/assign ist ein ungeschützter Zähler-GET · **Hoch**

**Symptom.** Ein GET ohne Body, ohne Session, ohne Bot-Check erhöht einen Produktionszähler. Der dafür nötige `snippet_key` ist öffentlich: `/api/resolve?host=<beliebige-domain>` liefert für jede fremde Domain alle Tests inklusive Schlüssel, Selektoren, Goals und Varianten-HTML. Damit lässt sich jeder fremde Test gezielt verfälschen — 600 Aufrufe pro Minute und IP.

**Behandlung.** Gehört in einen eigenen Sicherheits-Durchgang. Kurzfristig hilft die Bot-Erkennung aus DATA-02; strukturell bräuchte `resolve` eine Bindung an die aufrufende Origin.

### DATA-05 · Conversions ohne Token werden akzeptiert · **Hoch**

**Symptom.** Fehlt das Assignment-Token, wird die Conversion trotzdem gezählt (`app/api/event/route.ts:54`, nur eine `console.warn`). Das ist eine bewusste Graceful Degradation für den cookielosen Modus aus DATA-01 — mit zwei Konsequenzen: Fälschung ist trivial, und die serverseitige Deduplizierung greift nur, wenn ein Token vorhanden ist. Cross-Page-Conversions tragen nie eines und sind damit gar nicht deduplizierbar.

**Behandlung.** Hängt an DATA-01. Wird die Stickiness gelöst, kann das Token verpflichtend werden.

### DATA-06 · Token-TTL 30 min → legitime späte Conversion verloren · **Mittel**

**Symptom.** Das Token läuft nach 30 Minuten ab. Konvertiert ein Besucher später (langer Kaufprozess, Rückkehr am nächsten Tag mit gespeicherter Zuweisung), antwortet `/api/event` mit 403. `sendConversion` hat den Dedup-Flag aber **vor** dem Request gesetzt (`public/ab.js:580`), es gibt keinen Retry — die Conversion ist verloren. Betroffen sind gerade die wertvollen, überlegten Conversions.

**Behandlung.** TTL an den Anwendungsfall anpassen (mehrere Tage) oder bei abgelaufenem Token auf den token-losen Pfad zurückfallen, statt 403 zu antworten.

### DATA-07 · Replay-Schutz ist fail-open · **Mittel**

**Symptom.** `markConversionOnce` lässt die Conversion bei einem Redis-Fehler durch. Der In-Memory-Fallback gilt pro Vercel-Instanz und ist bei mehreren Instanzen praktisch wirkungslos. Fällt Upstash aus, gibt es faktisch keinen Replay-Schutz — bemerkt wird das nicht.

### DATA-08 · Rate-Limits pro IP treffen Büros und CGNAT · **Mittel**

**Symptom.** 300 Conversions pro Minute und gehashter IP. Hinter einer Firmen-IP oder einem CGNAT-Provider teilen sich hunderte echte Besucher ein Limit; darüber gibt es 429 ohne Retry. Für `/api/resolve` wurde dasselbe Problem bereits einmal behoben (30 → 600/min), für `/api/event` steht es noch aus.

### DATA-09 · Inkognito, Storage-Clear, Safari-ITP · **Hoch**

**Symptom.** Selbst mit Consent ist die Zuweisung nicht dauerhaft. Safari begrenzt localStorage-Einträge auf sieben Tage — bei der Mindestlaufzeit von sieben Tagen heißt das, dass ein nennenswerter Teil der wiederkehrenden Safari-Besucher **innerhalb der Testlaufzeit** neu gebucketet und erneut gezählt wird und erneut konvertieren kann. Inkognito-Fenster und Storage-Bereinigung wirken genauso.

**Behandlung.** Gehört zu DATA-01; ein serverseitiger Zuweisungsspeicher wäre die vollständige Lösung, ist aber ein eigenes Vorhaben.

### DATA-10 · Cross-Device und Cross-Domain ohne Identität · **Mittel**

**Symptom.** Ein Besucher sieht auf dem Desktop A und auf dem Handy B; beide Zuweisungen sind unabhängig, beide zählen. Bei Tests, die auf mehreren Domains derselben Marke laufen, gilt dasselbe. Das ist branchenüblich und nicht lösbar, gehört aber in die Ergebnis-Interpretation.

### DATA-11 · 409 auf paused/done verwirft Conversion still · **Niedrig**

**Symptom.** Wird ein Test pausiert, während ein Besucher noch mit der alten Konfiguration auf der Seite ist, lehnt `/api/event` dessen Conversion mit 409 ab. Der Client hat den Dedup-Flag schon gesetzt und versucht es nicht erneut. Die Conversion gehört fachlich noch zum Test.

### DATA-12 · Es gibt keine Impressions · **Hoch**

**Symptom.** Der Begriff „Besucher" im Dashboard meint in Wahrheit „Anzahl der `/api/assign`-Aufrufe". Es gibt kein Impression-Event; `eventBody` akzeptiert ausschließlich `'conversion'`. Wer B zugewiesen bekommt, B aber nie sieht — weil der Selektor nicht matcht (RUN-01), weil der Sanitizer ausfiel (RUN-13), weil das Element zu spät kam (RUN-07) — zählt trotzdem voll in den Nenner von Arm B.

**Behandlung.** Ein Impression-Event nach erfolgreichem Apply feuern und die Conversion-Rate darauf beziehen. Das ist zugleich die saubere Lösung für RUN-01, RUN-07 und RUN-13.

---

## D · Winner-Logik & Auto-Promotion (WIN)

| ID | Fall | Schwere | Status |
|---|---|---|---|
| WIN-01 | Mindestlaufzeit rechnet ab created_at | Kritisch | Offen |
| WIN-02 | Auto-Promotion ist per Default an und schaltet B auf 100 % | Kritisch | Behoben |
| WIN-03 | Pausenzeit zählt als Laufzeit | Hoch | Offen |
| WIN-04 | SRM erkennt „B wurde nie gerendert" nicht | Hoch | Offen |
| WIN-05 | Force-B räumt alte Client-Caches nicht auf | Niedrig | Offen |
| WIN-06 | Winner ohne Auto-Promotion bleibt im Zwischenzustand | Mittel | Offen |

### WIN-01 · Mindestlaufzeit rechnet ab created_at · **Kritisch**

**Symptom.** `evaluateWinner` prüft die 7-Tage-Mindestlaufzeit gegen `created_at` (`lib/significance.ts:150`), weil das Schema keinen anderen Zeitstempel hat — es gibt weder `started_at` noch `restarted_at`. Ein Test, der vor drei Wochen angelegt, zwei Wochen als Draft liegengelassen und gestern grundlegend geändert wurde, gilt als „seit drei Wochen gelaufen" und darf sofort entscheiden. Dieselbe Lücke gilt für die Besucher- und Conversion-Untergrenzen, die kumulativ über alle Konfigurationen zählen.

Die Schwellen selbst (1000 Besucher und 25 Conversions **pro Arm**, 7 Tage) sind bewusst konservativ gesetzt und statistisch gut begründet — sie greifen nur auf der falschen Datenbasis.

**Behandlung.** `started_at` und `restarted_at` einführen und die Laufzeit ab `max(started_at, restarted_at)` rechnen. Das ist die Voraussetzung dafür, dass der Reset aus EDIT-03 statistisch überhaupt etwas bewirkt.

### WIN-02 · Auto-Promotion ist per Default an und schaltet B auf 100 % · **Kritisch**

**Symptom.** `auto_promote_winner` steht per Default auf `true`. Erkennt der nächtliche Cron einen Gewinner B, setzt er `status='done'`; `/api/resolve` liefert daraufhin `force:'B'` (`app/api/resolve/route.ts:168`), und `ab.js` spielt B an **jeden** Besucher aus. Das ist eine dauerhafte, unangekündigte Änderung an der Live-Website des Kunden, ausgelöst von einem Cronjob.

In Kombination mit WIN-01 und EDIT-01 kann das auf Basis verfälschter Daten passieren: Test editieren, 7-Tage-Hürde ist wegen `created_at` schon gerissen, Cron entscheidet auf dem Mischtopf, B geht live.

**Behandlung. — Behoben.** Migration `041_auto_promote_opt_in.sql` setzt den Default auf `false` und zieht die Bestandszeilen mit — gerade weil die bestehenden `true`-Werte keine Entscheidung sind, sondern der alte Default. Zusätzlich ist der Cron von fail-open auf fail-safe umgestellt: `auto_promote_winner === true` statt `!== false`, damit ein fehlendes Profil oder ein fehlgeschlagener Select nicht mehr in einem Rollout endet.

**Offen:** Auto-Promotion zusätzlich sperren, solange ein Test während der Laufzeit bearbeitet wurde — das braucht die Markierung aus EDIT-02.

### WIN-03 · Pausenzeit zählt als Laufzeit · **Hoch**

**Symptom.** Ein Test, der eine Woche lief und danach drei Wochen pausiert war, gilt als vier Wochen gelaufen. Wird er fortgesetzt, kann er praktisch sofort entscheiden — auf Daten aus genau einer Woche, ohne dass die geforderte Abdeckung mehrerer Wochentage tatsächlich gegeben ist.

**Behandlung.** Effektive Laufzeit aus den `events` (`paused`/`resumed`) rechnen oder eine kumulative `active_seconds`-Spalte führen.

### WIN-04 · SRM erkennt „B wurde nie gerendert" nicht · **Hoch**

**Symptom.** Der Sample-Ratio-Mismatch-Check ist das einzige Sicherheitsnetz gegen kaputte Datenbasis — und er prüft ausschließlich das Verhältnis der Besucherzahlen. Bei RUN-01 (Selektor matcht nicht) ist dieses Verhältnis völlig korrekt: Beide Arme bekommen ihre 50 %. Nur konvertiert einer davon strukturell nie. Der häufigste reale Defekt läuft also genau durch das Netz, das ihn fangen sollte.

**Behandlung.** Zusätzlicher Plausibilitätscheck: Hat ein Arm nach ausreichender Stichprobe *null* Conversions, während der andere normal konvertiert, ist das kein Ergebnis, sondern ein Defekt — Test anhalten und melden statt einen Gewinner zu erklären.

### WIN-05 · Force-B räumt alte Client-Caches nicht auf · **Niedrig**

**Symptom.** Bei `done + winner='B'` liefert der Force-Pfad korrekt ohne Zählung und ohne Tracking aus. Endet ein Test dagegen mit `done + winner='A'`, bleiben die gespeicherten `ab_<key>`-Einträge der B-Besucher unbenutzt im Browser liegen. Funktional harmlos, aber es sammelt sich Datenmüll auf fremden Geräten an.

### WIN-06 · Winner ohne Auto-Promotion bleibt im Zwischenzustand · **Mittel**

**Symptom.** Ist die Auto-Promotion abgeschaltet, wird der Gewinner trotzdem persistiert, damit der Cron ihn nicht jede Nacht erneut meldet. Wendet der Kunde ihn nie an, bleibt der Test dauerhaft in „entschieden, läuft aber weiter" — sammelt weiter Daten, die niemand mehr auswertet, und blockiert im Free-Plan den einzigen Test-Slot.

**Behandlung.** Nach einer Frist erinnern oder den Test automatisch pausieren (nicht promoten), wenn der Gewinner unbeachtet bleibt.

---

## E · Lebenszyklus & Status (LIFE)

| ID | Fall | Schwere | Status |
|---|---|---|---|
| LIFE-01 | draft-Tests werden ausgeliefert und zählen | Hoch | Offen |
| LIFE-02 | Pause wirkt erst nach bis zu 30 s | Niedrig | Offen |
| LIFE-03 | Kein Wiederanlauf-Konzept | Hoch | Offen |
| LIFE-04 | Löschen ist der einzige Reset | Hoch | Offen |
| LIFE-05 | Domain-Gate greift nur bei der Erstellung | Mittel | Offen |
| LIFE-06 | Free-Plan-Limit zählt Drafts nicht mit | Mittel | Offen |

### LIFE-01 · draft-Tests werden ausgeliefert und zählen · **Hoch**

**Symptom.** `/api/resolve` schließt nur `paused` aus (`app/api/resolve/route.ts:111`). Ein `draft` wird also ganz normal ausgeliefert, und der erste Besucher promotet ihn per `ab_assign` automatisch auf `active`. Ein Test, den der Kunde noch gar nicht gestartet hat, sammelt bereits Daten — und ein Draft mit Health-Problemen bleibt zwar `draft`, wird aber weiterhin ausgeliefert und zählt Besucher (siehe RUN-12).

Es gibt schlicht kein „noch nicht gestartet" zum Auslieferungszeitpunkt.

**Behandlung.** `draft` in `resolve` ausschließen und die Aktivierung zu einer expliziten Nutzeraktion machen. Das behebt zugleich RUN-12 und LIFE-06.

### LIFE-02 · Pause wirkt erst nach bis zu 30 s · **Niedrig**

**Symptom.** Wegen des Edge-Cache wird ein pausierter Test noch bis zu 30 Sekunden ausgeliefert. Conversions aus diesem Fenster werden mit 409 abgelehnt (siehe DATA-11), Zuweisungen aber weiterhin gezählt.

### LIFE-03 · Kein Wiederanlauf-Konzept · **Hoch**

**Symptom.** Pausieren und Fortsetzen führt Zähler *und* Laufzeit ungebrochen weiter. Das ist besonders folgenreich, weil Pausieren die naheliegende Reaktion auf jedes Problem ist: Der Kunde bemerkt einen Fehler, pausiert, korrigiert, setzt fort — und hat danach die fehlerhaften Daten weiterhin im Zähler, ohne dass irgendwo steht, dass es je ein Vorher und Nachher gab.

**Behandlung.** Zusammen mit EDIT-03 und WIN-01 lösen: Beim Fortsetzen nach einer Änderung dieselbe Reset-Frage stellen wie beim Speichern.

### LIFE-04 · Löschen ist der einzige Reset · **Hoch**

**Symptom.** Siehe EDIT-03. Verschärfend: Der Kunde muss nach dem Neuanlegen ein neues Snippet auf seiner Website einbauen — für viele Zielgruppen (Designer, Agenturkunden ohne Deploy-Zugriff) eine echte Hürde, die zum Abbruch führt statt zu einem sauberen Neustart.

### LIFE-05 · Domain-Gate greift nur bei der Erstellung · **Mittel**

**Symptom.** Die Domain-Verifikation läuft ausschließlich beim Anlegen eines Tests. Wird eine Domain danach entfernt oder verliert ihre Verifikation, liefert `/api/resolve` die zugehörigen Tests unverändert weiter aus. Ein Kunde, der einen Kunden verliert oder eine Domain abgibt, verändert damit weiterhin fremde Websites.

**Behandlung.** Beim Entfernen einer Domain die zugehörigen Tests pausieren.

### LIFE-06 · Free-Plan-Limit zählt Drafts nicht mit · **Mittel**

**Symptom.** Das Free-Limit prüft nur Tests mit Status `active` oder `paused`. Beliebig viele Drafts sind erlaubt — die laut LIFE-01 aber ausgeliefert werden und zählen. Das Limit ist damit umgehbar, ohne dass jemand es darauf anlegen müsste.

**Behandlung.** Entfällt, sobald LIFE-01 behoben ist.

---

## F · Erstellung & Wizard (CREATE)

| ID | Fall | Schwere | Status |
|---|---|---|---|
| CREATE-01 | Kein Live-Preview der Variante | Hoch | Offen |
| CREATE-02 | Selektor wird nie gegen die Live-Seite geprüft | Hoch | Offen |
| CREATE-03 | Picker-Goal-Modus scheitert immer cross-origin | Hoch | Behoben |
| CREATE-04 | HTML/CSS werden bei 50 000 Zeichen still gekappt | Mittel | Offen |
| CREATE-05 | Ein Test hängt an genau einem Pfad | Mittel | Offen |
| CREATE-06 | Keine Kollisionserkennung zwischen Tests | Mittel | Offen |

### CREATE-01 · Kein Live-Preview der Variante · **Hoch**

**Symptom.** Es gibt keinen `?ab_preview`-Modus. Die Picker-Parameter (`?ab_pick`, `?ab_goal`, `?ab_reorder`) umgehen den A/B-Flow vollständig (`public/ab.js:466`). Der Kunde kann seine Variante also **nie kontrolliert auf der echten Seite ansehen**, ohne den Test scharf zu schalten. Das ist die direkte Ursache dafür, dass Rendering-Fehler (RUN-02, RUN-09, RUN-10) erst auffallen, wenn bereits Daten erhoben wurden — und dann laut EDIT-02 nur mit verfälschtem Ergebnis korrigierbar sind.

**Behandlung.** `?ab_preview=<snippet_key>` erzwingt B für diesen einen Aufruf, ohne Zuweisung und ohne Tracking. Klein im Aufwand, groß in der Wirkung: Es macht den gesamten Edit-während-aktiv-Zyklus in vielen Fällen überflüssig.

### CREATE-02 · Selektor wird nie gegen die Live-Seite geprüft · **Hoch**

**Symptom.** Der Selektor wird gegen einen zum Erfassungszeitpunkt gespeicherten DOM-Schnappschuss gewählt. Ob er auf der Live-Seite noch existiert, wird weder beim Anlegen noch später jemals geprüft — die Vorstufe zu RUN-01. Zwischen Erfassung und Teststart können Tage liegen.

**Behandlung.** Beim Aktivieren und danach periodisch (etwa im bestehenden Health-Cron) die Zielseite abrufen und prüfen, ob Selektor und Goal-Selektor auflösen. Ergebnis in `health_status`.

### CREATE-03 · Picker-Goal-Modus scheitert immer cross-origin · **Hoch**

**Symptom.** Im Goal-Modus PATCHt der Picker von der Kundendomain aus mit `Authorization`-Header auf `/api/tests/<id>` (`public/ab.js:273`). Der zugehörige `OPTIONS`-Handler ruft `preflight()` **ohne** das Request-Objekt auf (`app/api/tests/[id]/route.ts:10`) und antwortet daher immer mit der ersten erlaubten Origin. Von `https://kunde.de` kann der Preflight also nie durchgehen — der Aufruf landet zuverlässig im `catch` und der Kunde sieht „Network error while saving".

Der Wizard-Pfad ist nicht betroffen, weil er den Picker ohne Token öffnet und das Ergebnis per `postMessage` zurückgibt.

**Behandlung. — Behoben.** Die ursprüngliche Einschätzung („`preflight(req)` mit Request aufrufen") war falsch: `ALLOWED_ORIGINS` enthält ausschließlich die eigenen Domains, der Preflight einer Kundendomain scheitert also auch mit ausgewertetem Request. Der Goal-Modus läuft jetzt über `POST /api/capture` — diese Route hat bereits Wildcard-CORS, dieselbe Token-Auth und dieselbe Besitzprüfung. Bei gesetztem `goal` schreibt sie ausschließlich das Goal und lässt `selector`/`original_html` unangetastet, weil das Goal-Element ein anderes ist als das Testelement.

### CREATE-04 · HTML/CSS werden bei 50 000 Zeichen still gekappt · **Mittel**

**Symptom.** `/api/capture` lehnt `original_html` und `site_css` über 50 000 Zeichen ab. Auf großen Seiten fehlt der KI damit der Kontext, den sie für eine passende Variante bräuchte — die Generierung liefert plausibles, aber stilistisch unpassendes Markup.

### CREATE-05 · Ein Test hängt an genau einem Pfad · **Mittel**

**Symptom.** Das Pfad-Matching passiert clientseitig gegen den in `site_url` gespeicherten Pfad (bewusst so, aus DSGVO-Gründen — der Server sieht nur die Domain). Template-Seiten wie `/produkt/*` oder `/blog/*` lassen sich damit nicht testen, obwohl gerade dort die interessanten Volumina liegen.

**Behandlung.** Pfad-Muster (Präfix oder Glob) zulassen; das Matching bleibt clientseitig, die DSGVO-Eigenschaft bleibt erhalten.

### CREATE-06 · Keine Kollisionserkennung zwischen Tests · **Mittel**

**Symptom.** Nichts verhindert zwei gleichzeitig aktive Tests auf demselben oder auf überlappenden Elementen derselben Seite. Beide werden ausgeliefert, beide manipulieren dasselbe DOM, und beide messen ein Ergebnis, das die jeweils andere Manipulation enthält. Für den Kunden sieht es aus wie zwei unabhängige Tests.

**Behandlung.** Beim Anlegen prüfen, ob für denselben Host bereits ein aktiver Test mit gleichem oder verschachteltem Selektor existiert, und warnen.

---

## G · Priorisierung

Vier Wellen, nach dem Prinzip „zuerst das, was still falsche Ergebnisse produziert".

### Welle 1 — Still falsche Ergebnisse

| ID | Fall | Aufwand | Status |
|---|---|---|---|
| RUN-03 | `url:`-Goals entfernen oder implementieren | S | **Behoben** |
| WIN-02 | Auto-Promotion auf Opt-in umstellen | S | **Behoben** |
| EDIT-01 | Varianten-Hash im Client-Cache | S | **Behoben** (technische Hälfte) |
| RUN-05 | Anti-Flicker-Timeout senken | S | **Behoben** (nur Neuinstallationen) |
| CREATE-03 | Picker-Goal cross-origin | S | **Behoben** (nachgezogen aus Welle 4) |
| RUN-01 | Apply-Fehlschlag melden und nicht zählen | M | Offen |
| WIN-01 | `started_at` / `restarted_at` einführen | M | Offen |
| DATA-01 | Grundsatzentscheidung Stickiness | L | Offen |

### Welle 2 — Datenqualität

LIFE-01 (Drafts nicht ausliefern, behebt RUN-12 und LIFE-06 mit) · DATA-12 (Impressions) · DATA-02 (Bot-Filter) · DATA-03 (QA-Ausschluss) · WIN-04 (Null-Conversion-Plausibilität) · WIN-03 (effektive Laufzeit).

### Welle 3 — Edit-Flow vollständig

EDIT-02 bis EDIT-09 als ein Vorhaben: Änderungsklassifikation in `lib/`, Confirm-Guard in PATCH, `/api/generate` und `/api/capture`, Reset-Endpunkt, Edit-Events, UI-Dialog. Setzt WIN-01 (`restarted_at`) und EDIT-01 (Cache-Invalidierung) voraus.

### Welle 4 — Robustheit und Komfort

CREATE-01 (Live-Preview — hoher Nutzen, geringer Aufwand, ggf. vorziehen) · CREATE-03 (CORS-Fix, Einzeiler) · CREATE-02 (Selektor-Health) · RUN-06 bis RUN-11 · LIFE-04, LIFE-05 · DATA-06 bis DATA-10.

---

## Anhang · Was heute schon gut abgesichert ist

Der Vollständigkeit halber, damit der Katalog nicht den Eindruck erweckt, es sei nichts abgesichert:

- **Die statistischen Schwellen sind konservativ und gut begründet** — 1000 Besucher und 25 Conversions pro Arm, 7 Tage Mindestlaufzeit, zweiseitiger z-Test, SRM-Prüfung. Das Problem liegt nirgends in der Statistik selbst, sondern in der Datenbasis, auf die sie angewendet wird.
- **Winner-Entscheidungen laufen bewusst nur im Tagescron**, nicht im Conversion-Pfad — kein Peeking.
- **Die Interaktions-Portierung in `ab.js` ist ungewöhnlich sorgfältig** und durch 31 JSDOM-Checks in `__tests__/variant-interaction.mjs` abgedeckt, die den echten Code aus `ab.js` extrahieren statt ihn zu duplizieren.
- **Server- und Client-Pfadlogik werden auf Parität getestet** (`resolve-path-semantics.mjs`, `resolve-host-parity.mjs`).
- **XSS-Sanitization läuft fail-closed**, inklusive Regressionstest für den Importfehler, der `/api/resolve` einmal lahmgelegt hat.
- **Temp-Session-Tests können nie auf einer echten Website landen** (`user_id`-Filter in `resolve`).
