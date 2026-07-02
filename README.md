# MGFL — Système de gestion du Marché de Gros de Fruits et Légumes de Casablanca

Implémentation de référence : **API .NET 8 (Clean Architecture)** + **front React (Vite + TypeScript + Tailwind)**
+ **application mobile transporteurs (React Native / Expo)**.
Couvre le cycle complet d'un arrivage : pré-déclaration (mobile + web), pesage et taxe, génération de
l'état de base (contrôle de vraisemblance **bloquant**), sortie avec libération automatique des
emplacements, prix de référence hebdomadaires versionnés, infractions et référentiels.

```
mgfl/
├── backend/                 # Solution .NET 8
│   ├── MGFL.sln
│   ├── src/
│   │   ├── MGFL.Domain/          # Entités + calculs métier purs (taxe, état de base, vraisemblance, infractions)
│   │   ├── MGFL.Application/     # CQRS (MediatR) + DTOs + validation (FluentValidation)
│   │   ├── MGFL.Infrastructure/  # EF Core (DbContext, migrations, seed) — SQL Server ou InMemory
│   │   └── MGFL.Api/             # Controllers, JWT + RBAC, CORS, Swagger, ProblemDetails
│   └── tests/
│       ├── MGFL.Domain.Tests/          # xUnit — toutes les formules financières
│       ├── MGFL.Application.Tests/     # Validators + génération état de base (cas A/B/C, blocage)
│       └── MGFL.Api.IntegrationTests/  # WebApplicationFactory — auth, RBAC, flux pesage→sortie
├── frontend/                # Back-office React + Vite + TS + Tailwind
│   └── src/
│       ├── app/             # shell + routing + garde d'authentification
│       ├── components/ui/   # design system (Card, Button, Pill, Field)
│       ├── features/        # auth, dashboard, pré-déclarations, arrivage, état de base,
│       │                    # emplacements, prix de référence, infractions, référentiels
│       ├── lib/             # client axios + JWT, stores, services, formatters MAD/kg
│       └── types/           # types partagés (miroir des DTOs)
└── mobile/                  # App transporteurs React Native (Expo, TypeScript)
    └── src/                 # login, mes voyages, pré-déclaration (photo + géoloc), QR code,
                             # file d'attente hors-ligne (AsyncStorage)
```

## Démarrage rapide

### Backend (port 5080)
```bash
cd backend
dotnet restore
dotnet test                       # 38 tests : formules, validators, intégration API
dotnet run --project src/MGFL.Api # Swagger sur http://localhost:5080/swagger
```
> Par défaut, l'API démarre avec une **base InMemory pré-remplie** (zéro config).
> Pour SQL Server, renseigner `ConnectionStrings:Default` dans `appsettings.json` —
> les **migrations EF Core** (`src/MGFL.Infrastructure/Persistence/Migrations`) sont appliquées au démarrage.

### Frontend (port 5173)
```bash
cd frontend
npm install
npm test                          # Vitest + React Testing Library
npm run dev                       # http://localhost:5173
```
Par défaut le front tourne en **mode mock** (aucun backend requis). Pour attaquer l'API .NET :
```
# frontend/.env
VITE_API_MODE=real
VITE_API_URL=http://localhost:5080
```

### Mobile transporteurs (Expo)
```bash
cd mobile
npm install
npx expo start                    # "a" pour l'émulateur Android
```
> URL de l'API dans `mobile/src/lib/config.ts` (défaut `http://10.0.2.2:5080`, loopback émulateur Android ;
> mettre l'IP LAN du poste pour un appareil physique). Compte de démo : `transporteur` / `Route@2026`.

## Comptes de démonstration

| Compte | Mot de passe | Rôle |
|--------|--------------|------|
| `admin` | `Admin@2026` | Admin (référentiels, tout accès) |
| `agent.pab` | `Pesage@2026` | Agent Pont à Bascule (pesage, état de base, sortie) |
| `agent.orga` | `Parking@2026` | Agent d'Organisation (emplacements) |
| `commission` | `Prix@2026` | Commission des Prix |
| `commercant` | `Marche@2026` | Commerçant |
| `transporteur` | `Route@2026` | Transporteur (pré-déclarations, mobile) |

## Règles métier implémentées

| Règle | Emplacement |
|-------|-------------|
| `PoidsNet = (Brut − Tare) − Emballage` ; `Taxe = Net × PrixTaxe` | `TaxCalculator` |
| État de base — emballé / multi-articles triés par prix croissant / vrac au pourcentage | `EtatDeBaseCalculator` |
| Contrôle de vraisemblance **bloquant** (tolérance paramétrable `Plausibility:Tolerance`, défaut ±15 %) — appliqué au pesage (`POST /api/arrivals`, 422 sans persistance) et à `POST /api/etats-de-base/generate` | `PlausibilityChecker` |
| Sortie du camion : clôture + **libération automatique** des emplacements | `ArrivalsController.Depart` |
| Réservation d'emplacement → **frais** (jours inclusifs × tarif `Reservations:DailyRate`, défaut 250 MAD/j) | `SpotReservation` / `ReservationsController` |
| Prix de référence hebdomadaires **versionnés** (`DateEffet`, jamais écrasés) | `ReferencePriceHistory` |
| Infractions ×2 (évasion, manque de déclaration, emballage différent) | `InfractionCalculator` |
| Un transporteur ne voit que **ses propres voyages** | `PreDeclarationsController` (`CreatedByUsername`) |

Toutes ces règles sont couvertes par les projets de tests (`dotnet test`).

## Endpoints principaux

| Méthode | Route | Rôle |
|---------|-------|------|
| `POST` | `/api/auth/login` · `GET /api/auth/me` | Authentification JWT (8 h) |
| `GET/POST` | `/api/pre-declarations` | Voyages (création : Transporteur) |
| `POST` | `/api/arrivals` | Pesage + taxe + état de base (422 si vraisemblance bloque) |
| `POST` | `/api/arrivals/{code}/depart` | Sortie : clôture + libération des emplacements |
| `POST` | `/api/etats-de-base/generate` | Génération état de base à la demande |
| `GET` | `/api/etats-de-base` · `/{number}/pdf` | Liste des documents + **PDF imprimable** (QuestPDF) |
| `GET/POST` | `/api/reservations` · `POST /{id}/end` | Réservations d'emplacements avec frais |
| `POST` | `/api/uploads/photos` | Upload photo (multipart, 5 Mo max, servi sous `/uploads/photos`) |
| `GET/PUT` | `/api/prix-reference` | Grille hebdomadaire (publication : CommissionPrix) |
| `GET/PUT` | `/api/emplacements` | Plan du parking (modification : AgentOrganisation) |
| `GET/POST` | `/api/infractions` | Pénalités |
| CRUD | `/api/articles`, `/api/transporters`, `/api/vehicles`, `/api/buyers`, `/api/packagings`, `/api/merchandise-owners` | Référentiels (écriture : Admin) |

## Sécurité

**Deny by default** : tout endpoint exige un JWT valide (`FallbackPolicy`), chaque écriture déclare sa
policy de rôle explicite (cf. `CLAUDE.md` §8). Erreurs au format `ProblemDetails` (RFC 7807).
La clé JWT de `appsettings.json` est une valeur de dev — la remplacer (User Secrets / variable
d'environnement) en production, avec HTTPS forcé et CORS restreint au domaine du front.

## Intégration continue

Workflow GitHub Actions (`.github/workflows/ci.yml`) : build + tests .NET, tests + build du front,
type-check TypeScript du mobile — déclenché sur push `main` et pull requests.

## Reste à construire (itérations suivantes)

Notifications (voyage pesé / réservation expirée), reporting exploitant (volumes, taxes par période),
tests end-to-end navigateur (Playwright), et durcissement production (HTTPS, secrets gérés, sauvegardes).
