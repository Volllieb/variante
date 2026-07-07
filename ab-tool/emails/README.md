# variante Email Templates — Supabase Auth

> Brand-konforme HTML-Templates für Supabase Auth Emails.
> Monochrom (Panda), kein Gradient, kein Schatten. Genau 3 Funktionsfarben.

---

## Schritt-für-Schritt-Anleitung

### 1. Supabase Dashboard öffnen

Gehe zu **[supabase.com/dashboard](https://supabase.com/dashboard)** → dein Projekt → **Authentication** → **Email Templates**

### 2. Templates ersetzen

Du siehst 5 Template-Tabs. Für jeden Tab:

1. HTML-Inhalt aus der entsprechenden `.html`-Datei in diesem Ordner kopieren
2. In das Textfeld unter dem Tab einfügen
3. **Subject**-Zeile anpassen (siehe Tabelle unten)

| Tab | Datei | Subject |
|---|---|---|
| **Confirm Signup** | `confirmation.html` | `Confirm your email for variante` |
| **Magic Link** | `magic-link.html` | `Your login link for variante` |
| **Reset Password** | `reset-password.html` | `Reset your variante password` |
| **Invite User** | `invite.html` | `You've been invited to variante` |
| **Change Email** | `email-change.html` | `Confirm your new email for variante` |
| **Password Changed** | `password-changed.html` | `Your variante password was changed` |
| **Email Address Changed** | `email-address-changed.html` | `Your variante email address was changed` |
| **Sign-in Method Removed** | `sign-in-method-removed.html` | `A sign-in method was removed from variante` |

### Security-Templates (Notifications)

Die 3 Security-Templates sind **reine Benachrichtigungen**, keine Action-Emails. Design-Unterschiede:
- Kein großer CTA-Button — stattdessen ein kleiner Text-Link zum Login
- `Security notice`-Badge in `--pro`-Gelb
- "Not you?"-Infobox mit Handlungsempfehlung
- `email-address-changed` zeigt Old/New-Email nebeneinander in Monospace (siehe `{{ .NewEmail }}`)

### 3. Logo hochladen (optional, aber empfohlen)

Für beste Darstellung in allen Mailclients:

1. Das SVG `logo-email.png` (aus dem `public/`-Ordner) auf deinen Server legen — z. B. unter `https://www.getvariante.com/email-logo.png`
2. In jedem Template den `src`-Wert des `<img>`-Tags auf diese URL ändern
3. Alternativ: Logo als **Base64** inline einbetten (ist bereits in den Templates so gemacht — siehe `<!-- LOGO -->`-Kommentar)

**Wichtig:** Das Logo ist bereits als inline Base64-PNG eingebettet. Kein externer Host nötig. Getestet in Gmail, Apple Mail, Outlook.

### 4. Custom SMTP (optional — bessere Zustellbarkeit)

Falls du Resend als SMTP-Backend nutzen willst (statt Supabase-default):

1. **Supabase → Authentication → Settings → SMTP**
2. **Enable Custom SMTP** aktivieren
3. Folgende Daten eintragen:

| Feld | Wert |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Sender Name | `variante` |
| Sender Email | `login@getvariante.com` |
| Username | `resend` |
| Password | Dein Resend API Key (`re_...`) |

4. In Resend: Domain `getvariante.com` verifizieren (DNS-Einträge: SPF, DKIM)

**Vorteile SMTP über Resend:**
- Bessere Deliverability (Resends IPs sind wärmer als Supabases Shared IPs)
- Open/Click-Tracking im Resend-Dashboard
- Einheitlicher Versand (Winner-Mails + Auth-Mails aus einer Hand)

### 5. Testen

Supabase hat einen **"Send Test Email"**-Button rechts oben im Template-Editor. Nutz ihn, um jedes Template durchzutesten.

---

## Variablen-Referenz (Supabase)

| Variable | Verfügbar in |
|---|---|
| `{{ .ConfirmationURL }}` | Confirm Signup, Reset Password, Change Email, Invite |
| `{{ .Email }}` | Alle Templates |
| `{{ .SiteURL }}` | Alle Templates |
| `{{ .Token }}` | Magic Link |
| `{{ .TokenHash }}` | Magic Link |
| `{{ .RedirectTo }}` | Alle Templates |
| `{{ .NewEmail }}` | Change Email |

---

## Design-Regeln (Brand-konform)

- **Farben:** `#000000` (Schwarz), `#ededed` (Text), `#666666` (Sekundärtext), `#e5e5e5` (Border)
- **Funktionsfarben:** `#2fd76c` ✅ · `#f5a623` 🔒 · `#f5455c` ❌ — NUR für Bedeutung, nie Dekoration
- **Keine** Schatten, Gradients, Blur-Effekte, abgerundete Cards >10px
- **Buttons:** `border-radius: 6px`, Schwarz mit weißem Text (inverted)
- **Font:** Inter, -apple-system, Segoe UI, sans-serif
- **Max-Width:** 480px — lesbar auf Mobile und Desktop
