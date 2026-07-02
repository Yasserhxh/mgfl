# CLAUDE.md — Système de Gestion du MGFL Casablanca

> Configuration & contexte projet pour Claude Code.
> Domaine : **Marché de Gros de Fruits et Légumes de Casablanca (MGFL)**.
> Stack : **React + TypeScript (web)** · **ASP.NET Core Web API (.NET)** · **React Native (mobile transporteurs)**.

---

## 1. Ton rôle

Tu agis comme un **ingénieur staff/senior full-stack** avec une double expertise :

- **Backend .NET** — ASP.NET Core Web API, EF Core, SQL Server, architecture en couches (Clean Architecture), DDD léger.
- **Frontend React** — React 18 + TypeScript, gestion d'état serveur (TanStack Query), formulaires typés, design system.

Tu as des **réflexes sécurité par défaut** (OWASP Top 10 : authz/authn, validation d'entrée, anti-XSS/CSRF, requêtes paramétrées, gestion des secrets). Tu écris du code **production-ready, testable et documenté**, pas des prototypes jetables. Quand une règle métier est ambiguë dans la spec, tu poses la question plutôt que de deviner — les calculs de **taxe** et de **poids** ont une portée financière et réglementaire.

**Conventions de langue :** le **code, les noms de classes/variables et les commentaires techniques sont en anglais** ; les **termes métier restent en français** lorsqu'ils n'ont pas d'équivalent naturel (`étatDeBase`, `pontÀBascule`, `matricule`, `emplacement`, `carteGrise`). L'UI utilisateur est en **français**. Voir le glossaire (§11) pour le mapping FR → EN des entités.

---

## 2. Vue d'ensemble du domaine

Le système digitalise l'exploitation du Marché de Gros. Il couvre le cycle complet d'un arrivage de marchandise, du véhicule transporteur jusqu'à la taxation et la gestion des infractions :

1. **Pré-déclaration mobile** d'arrivée d'un véhicule par le transporteur.
2. **Arrivage & pesage** au Pont à Bascule, calcul automatique de la taxe.
3. **Génération de l'état de base** (document fiscal/logistique imprimé).
4. **Mise à jour hebdomadaire des prix de référence** par une commission.
5. **Gestion du parking / emplacements** par l'agent d'organisation.
6. **Gestion des infractions** (pénalités).

---

## 3. Stack technique & versions

### Backend
- **.NET 8 (LTS)** — ASP.NET Core Web API (`.NET 9` accepté si déjà en place).
- **Entity Framework Core 8** + **SQL Server**.
- **MediatR** (CQRS léger : commands/queries) — optionnel mais préféré pour la logique métier.
- **FluentValidation** pour la validation des DTO/commandes.
- **AutoMapper** (ou mapping manuel) entités ⇄ DTO.
- **Serilog** pour le logging structuré.
- **JWT Bearer** + **rôles/policies** pour l'authz.
- **Swagger/OpenAPI** activé en dev.
- Tests : **xUnit** + **FluentAssertions** + **Moq** ; intégration via **WebApplicationFactory**.

### Frontend (web — back-office exploitation)
- **React 18 + TypeScript**, build **Vite**.
- **React Router** (routing), **TanStack Query** (état serveur/cache), **Axios** (client HTTP).
- **React Hook Form + Zod** (formulaires + validation typée).
- **Tailwind CSS** + composants **shadcn/ui** (ou MUI si tu préfères un design system clé en main) — respecter les **design tokens** du §9.
- Tests : **Vitest** + **React Testing Library**.

### Mobile (transporteurs — pré-déclaration)
- **React Native (Expo)** — caméra (photo marchandise), géolocalisation, **génération/scan de QR code**, mode offline tolérant (file d'attente de synchronisation).

---

## 4. Architecture

### Backend — Clean Architecture (4 projets)
```
src/
  MGFL.Domain/           # Entités, Value Objects, règles métier pures, interfaces de repo
  MGFL.Application/      # Use cases (MediatR), DTOs, validators, interfaces de services
  MGFL.Infrastructure/   # EF Core (DbContext, configs, migrations), implémentations repos, services externes
  MGFL.Api/              # Controllers, middlewares, auth, DI, Swagger, mapping HTTP
tests/
  MGFL.Domain.Tests/
  MGFL.Application.Tests/
  MGFL.Api.IntegrationTests/
```
**Règles d'or :** les dépendances pointent toujours vers l'intérieur (Api → Application → Domain ; Infrastructure → Domain). La **logique de calcul de taxe vit dans le Domain** (testable sans base ni HTTP).

### Frontend — feature-based
```
src/
  app/            # providers, router, layout
  features/
    pre-declaration/
    arrivage/
    etat-de-base/
    prix-reference/
    emplacements/
    infractions/
    referentiels/   # CRUD master data
  components/ui/   # composants design-system réutilisables
  lib/             # axios client, query client, helpers, formatters
  hooks/
  types/           # types partagés (idéalement générés depuis l'OpenAPI)
```

---

## 5. Modèle de données (référentiels / master data)

Implémente ces entités (FR conceptuel → nom de classe EN suggéré) :

- **MerchandiseOwner** (Propriétaires de marchandises).
- **Vehicle** (Véhicule) : `Matricule`, `TransporteurId`, `DateMiseEnService`, `NumeroCarteGrise`, `PoidsTare`, `Photo`.
- **Transporter** (Transporteur) : sens `Entrant`/`Sortant`.
- **Weighbridge** (Pont à Bascule).
- **Premises** (Locaux) : type `Magasin` / `Pavillon` / `Carré`. Un magasin possède **2 emplacements**.
- **Article** : `Code`, `Famille`.
- **Packaging** (Emballage) : `Type` (Carton/Plastique/Bois), `Categorie` (Caisse/Palette/Sac), `Poids`. **Contrainte : max 26 palettes par camion.**
- **ArticleReferenceWeight** (Poids de référence d'un article par emballage — ex. pomme de terre = 30 kg/caisse).
- **ReferencePrice** (Prix de référence) : `PrixMin`, `PrixMax`, `PrixUnitaireTaxe`, `DateEffet` (maj hebdomadaire — voir §7.4).
- **Buyer** (Acheteur) : grossiste, mandataire, cantine scolaire, entreprise, magasin, vendeur au détail.
- **Employee** : sous-types `MerchantEmployee`, `ServiceProviderEmployee` (sécurité/nettoyage), `MarketEmployee`.
- **ParkingSpot** (Emplacement) : rattaché à un `Premises`, statut `Libre`/`Occupé`/`Réservé`.
- **SpotReservation** (Réservation d'emplacement) : `MerchantId`, `Debut`, `Fin`, `Frais`.

### Entités transactionnelles
- **PreDeclaration** : matricule, source marchandise, lignes (article + tonnage approx.), photo, géolocalisation, `QrCode`, statut.
- **Arrival** (Arrivage) : lien pré-déclaration, pesées, magasin réceptionnaire, état de base.
- **WeighingTicket** : `PoidsBrut`, `PoidsTareVide`, `PoidsEmballage`, `PoidsNet`.
- **EtatDeBase** : lignes par article, valeurs, taxes, statut impression, accusé de réception (cachet).
- **Infraction** : type, montant calculé, référence à l'arrivage/transporteur.

---

## 6. Flux fonctionnels

### 6.1 Pré-déclaration d'arrivée (mobile)
Transporteur authentifié → saisie matricule → sélection source marchandises (liste) → sélection articles chargés → tonnage approximatif par article → photo → géolocalisation auto → **enregistrement + génération du QR code**.

### 6.2 Arrivage & pesage (Pont à Bascule)
Présentation du camion → **scan du QR** → pesage → affichage auto des infos du voyage (transporteur, véhicule, articles) → **calcul auto de la taxe** (§7.1) → déclaration du n° de magasin réceptionnaire → l'agence PàB saisit la destination → **impression de l'état de base** remis au transporteur **contre la carte grise** → déchargement au magasin → **accusé de réception (cachet humide)** → retour au PàB : remise de l'état de base, récupération de la carte grise, sortie.

### 6.3 Agent d'organisation (parking)
Orientation des transporteurs, déclaration d'occupation des emplacements. **Libération automatique** de l'emplacement au départ du transporteur.

### 6.4 Réservation d'emplacements
Un commerçant peut réserver des emplacements pour une durée déterminée → **génère des frais** à sa charge.

---

## 7. Règles métier & formules (CRITIQUE — implémenter à l'identique)

> Ces calculs sont **financiers**. Couvre-les par des **tests unitaires** dans `MGFL.Domain.Tests`. Utilise `decimal` (jamais `double`/`float`) pour poids, prix et montants.

### 7.1 Calcul de la taxe (cas pesée simple)
```
PoidsNet = (PoidsBrut − PoidsTareVide) − PoidsEmballage
Taxe     = PoidsNet × PrixUnitaireTaxe
```

### 7.2 Génération de l'état de base
**Cas A — un seul article emballé :**
```
PoidsNet         = NombreCaissesChargées × PoidsRéférenceParCaisse
ValeurMarchandise = PoidsNet × PrixRéférence
TaxeAdValorem     = ValeurMarchandise × PrixTaxeArticle
```
**Cas B — plusieurs articles emballés :** trier les articles par **prix de référence croissant**, puis appliquer les formules du cas A **dans cet ordre**.

**Cas C — plusieurs articles en vrac :** estimer le poids par produit **au pourcentage**, puis appliquer les mêmes calculs.

### 7.3 Contrôle de vraisemblance (plausibility check) — BLOQUANT
Avant de générer l'état de base, pour **chaque article** :
```
PoidsRéelParCaisse = PoidsTotalDéclaré / NombreCaissesChargées
Comparer PoidsRéelParCaisse  vs  PoidsRéférenceParCaisse (théorique, paramétré)
```
- Définir un **seuil de tolérance paramétrable** (ex. ±X %).
- **En cas d'écart hors tolérance → les données sont incohérentes → BLOQUER la génération de l'état de base** et exiger une vérification/correction manuelle.
- Objectif : fiabiliser les données, éviter la propagation d'erreurs de saisie/comptage/chargement.

### 7.4 Prix de référence
**Chaque jeudi**, mise à jour des prix unitaires min/max par article. À partir de ces prix, **une commission** définit le `PrixUnitaireTaxe` applicable. Historiser via `DateEffet` (ne jamais écraser : versionner).

### 7.5 Infractions (pénalité ×2 dans les trois cas)
```
Évasion                          = MontantTaxe × 2
Manque de déclaration d'article  = (PoidsNonDéclaré × PrixArticle) × 2
Emballage différent déclaré      = MontantTaxe × 2
```

### 7.6 Contraintes structurelles
- Max **26 palettes par camion**.
- Chaque magasin = **2 emplacements**.
- Libération d'emplacement **automatique** au départ.

---

## 8. Rôles & permissions (RBAC)

| Rôle | Périmètre |
|------|-----------|
| `Transporteur` | Pré-déclaration mobile, consultation de ses voyages. |
| `AgentPontBascule` | Pesage, saisie destination, impression état de base, accusé. |
| `AgentOrganisation` | Gestion parking / occupation des emplacements. |
| `CommissionPrix` | Mise à jour prix de référence & prix de taxe. |
| `Commerçant` | Réservation d'emplacements, gestion de ses employés. |
| `Admin` | Référentiels, utilisateurs, paramétrage (seuils, taxes). |

Implémentation : **JWT + policies/claims**. Refus par défaut (`deny by default`) ; chaque endpoint déclare explicitement sa policy.

---

## 9. Design system & couleurs

> **Source de vérité : `frontend/tailwind.config.js`** (`theme.extend.colors`). Le mobile
> reprend les mêmes valeurs dans `mobile/src/lib/theme.ts`. Toute évolution de palette se fait
> dans ces deux fichiers — jamais de hex en dur dans les composants.

```css
/* design tokens effectifs — marque verte (fruits & légumes), neutres zinc */
:root {
  --color-primary:        #1A7F37; /* vert de marque (nav active, logo, boutons) */
  --color-primary-hover:  #116329;
  --color-primary-soft:   #E6F4EA;
  --color-accent:         #94C245; /* vert lime (finition logo / mise en avant) */

  /* statuts */
  --color-success:        #00BC7D; /* Générés / Clôturé */
  --color-danger:         #E7000B; /* Infractions / blocages vraisemblance */
  --color-warning:        #B69E05; /* Bloqués / En attente */
  --color-info:           #1183D4; /* En cours / Pesé */

  /* neutres (zinc) */
  --color-bg:             #FAFAFA; /* canvas */
  --color-surface:        #FFFFFF;
  --color-border:         #E4E4E7; /* line */
  --color-text:           #111113; /* ink */
  --color-text-muted:     #71717A; /* muted */
}
```
Utiliser **exclusivement les tokens** (`bg-primary`, `text-danger`, `border-line`, `text-ink`, `text-muted`…) ; chaque statut a une variante `soft` pour les pills/bandeaux.

---

## 10. Standards de code & sécurité

**Backend**
- `async/await` partout en I/O ; pas de `.Result`/`.Wait()`.
- DTOs en entrée/sortie d'API — **ne jamais exposer les entités EF directement**.
- Validation systématique (FluentValidation) ; rejet précoce des entrées invalides.
- EF Core paramétré (pas de SQL concaténé) ; `decimal(18,3)` pour poids, `decimal(18,2)` pour montants.
- Secrets via `appsettings` + **User Secrets/variables d'environnement** (jamais commités).
- Erreurs : `ProblemDetails` (RFC 7807), pas de stack trace exposée en prod.
- Logging structuré (Serilog) sans données sensibles (pas de carte grise / token en clair).

**Frontend**
- TypeScript strict (`strict: true`), pas de `any` non justifié.
- État serveur via TanStack Query (clés de cache cohérentes, invalidation après mutation).
- Échapper/encoder les sorties ; jamais de `dangerouslySetInnerHTML` sans sanitisation.
- Token JWT en mémoire/`httpOnly cookie` si possible ; pas de secret dans le bundle.

**Transverse (OWASP Top 10)**
- Authz vérifiée côté serveur sur **chaque** endpoint (jamais seulement côté UI).
- CORS restrictif, HTTPS forcé, en-têtes de sécurité.
- Idempotence/validation sur les opérations financières (taxe, infractions, réservations).

---

## 11. Glossaire FR → EN (nommage)

| Métier (FR) | Code (EN) |
|-------------|-----------|
| État de base | `EtatDeBase` (conservé tel quel — doc officiel) |
| Pont à Bascule | `Weighbridge` |
| Matricule | `LicensePlate` (`Matricule` accepté) |
| Carte grise | `RegistrationCard` (`CarteGrise` accepté) |
| Emplacement | `ParkingSpot` |
| Emballage | `Packaging` |
| Caisse / Palette / Sac | `Crate` / `Pallet` / `Bag` |
| Poids tare | `TareWeight` |
| Poids net / brut | `NetWeight` / `GrossWeight` |
| Prix de référence | `ReferencePrice` |
| Taxe Ad Valorem | `AdValoremTax` |
| Infraction | `Infraction` / `Violation` |
| Transporteur | `Transporter` |
| Réceptionnaire | `Receiver` |

---

## 12. Definition of Done

- [ ] Règles métier (§7) couvertes par des tests unitaires (cas nominaux + écarts de vraisemblance).
- [ ] DTOs validés (FluentValidation côté API, Zod côté front).
- [ ] Endpoints protégés par policy explicite (RBAC §8).
- [ ] Migrations EF Core générées et revues.
- [ ] Pas de secret/hex en dur ; tokens de design utilisés partout.
- [ ] Erreurs gérées via `ProblemDetails` + toasts front cohérents.
- [ ] README/Swagger à jour pour chaque feature livrée.

---

## 13. Premières étapes suggérées

1. Scaffolder la solution .NET (4 projets + tests) et le front Vite/React/TS.
2. Modéliser le **Domain** (entités §5) + `MGFL.Domain.Tests` sur les **formules §7**.
3. Implémenter le flux **Arrivage → état de base** de bout en bout (use case le plus à risque).
4. Brancher l'auth JWT + RBAC, puis le CRUD des référentiels.
5. Mobile (Expo) : écran de pré-déclaration + génération QR.
