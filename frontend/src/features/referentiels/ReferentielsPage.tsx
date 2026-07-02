import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { kg, mad } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import {
  BUYER_TYPE_LABELS,
  articlesResource,
  buyersResource,
  merchandiseOwnersResource,
  packagingsResource,
  transportersResource,
  vehiclesResource,
  type TransporterDto,
  type TransporterInput,
} from "../../lib/referentiels";
import { CrudSection, type FieldDef } from "./CrudSection";
import {
  BUYER_TYPES,
  DIRECTIONS,
  PACKAGING_CATEGORIES,
  PACKAGING_TYPES,
  articleSchema,
  buyerSchema,
  merchandiseOwnerSchema,
  packagingSchema,
  transporterSchema,
  vehicleSchema,
} from "./schemas";

const num = (v: number) => String(v);

// --- Onglets ---

function ArticlesTab() {
  const fields: FieldDef[] = [
    { key: "code", label: "Code", type: "text", placeholder: "PDT" },
    { key: "name", label: "Nom", type: "text", placeholder: "Pomme de terre" },
    { key: "famille", label: "Famille", type: "text", placeholder: "Légumes" },
    { key: "referenceWeightPerCrate", label: "Poids de référence / caisse (kg)", type: "number", step: "0.1" },
    { key: "referencePrice", label: "Prix de référence (MAD/kg)", type: "number", step: "0.1" },
    { key: "taxUnitPrice", label: "Prix unitaire de la taxe (MAD/kg)", type: "number", step: "0.001" },
  ];
  return (
    <CrudSection
      title="Articles"
      subtitle="Familles, poids de référence par caisse, prix de référence et prix de la taxe"
      resourceKey="articles"
      resource={articlesResource}
      fields={fields}
      schema={articleSchema}
      emptyValues={{ code: "", name: "", famille: "", referenceWeightPerCrate: "", referencePrice: "", taxUnitPrice: "" }}
      toValues={(a) => ({
        code: a.code,
        name: a.name,
        famille: a.famille,
        referenceWeightPerCrate: num(a.referenceWeightPerCrate),
        referencePrice: num(a.referencePrice),
        taxUnitPrice: num(a.taxUnitPrice),
      })}
      columns={[
        { header: "Code", render: (a) => <span className="font-mono text-xs text-muted">{a.code}</span> },
        { header: "Nom", render: (a) => <span className="font-medium text-ink">{a.name}</span> },
        { header: "Famille", render: (a) => a.famille },
        { header: "Poids réf. / caisse", render: (a) => kg(a.referenceWeightPerCrate) },
        { header: "Prix réf.", render: (a) => mad(a.referencePrice) },
        { header: "Prix taxe", render: (a) => `${a.taxUnitPrice.toFixed(3)} MAD/kg` },
      ]}
    />
  );
}

function TransportersTab() {
  const fields: FieldDef[] = [
    { key: "name", label: "Nom", type: "text", placeholder: "Transport Atlas" },
    { key: "phone", label: "Téléphone", type: "text", placeholder: "0661-000000" },
    {
      key: "direction",
      label: "Sens",
      type: "select",
      options: DIRECTIONS.map((d) => ({ value: d, label: d })),
    },
  ];
  return (
    <CrudSection<TransporterDto, TransporterInput>
      title="Transporteurs"
      subtitle="Sociétés de transport entrantes et sortantes du marché"
      resourceKey="transporters"
      resource={transportersResource}
      fields={fields}
      schema={transporterSchema}
      emptyValues={{ name: "", phone: "", direction: "" }}
      toValues={(t) => ({ name: t.name, phone: t.phone, direction: t.direction })}
      columns={[
        { header: "Nom", render: (t) => <span className="font-medium text-ink">{t.name}</span> },
        { header: "Téléphone", render: (t) => t.phone },
        { header: "Sens", render: (t) => t.direction },
      ]}
    />
  );
}

function VehiclesTab() {
  // Same cache as the Transporteurs tab: kept in sync by its CRUD invalidations.
  const { data: transporters = [] } = useQuery({
    queryKey: queryKeys.referentiels("transporters"),
    queryFn: () => transportersResource.list(),
  });

  const fields: FieldDef[] = [
    { key: "matricule", label: "Matricule", type: "text", placeholder: "45821-A-6" },
    {
      key: "transporterId",
      label: "Transporteur",
      type: "select",
      options: transporters.map((t) => ({ value: String(t.id), label: t.name })),
    },
    { key: "numeroCarteGrise", label: "N° carte grise", type: "text", placeholder: "CG-000000" },
    { key: "poidsTare", label: "Poids tare (kg)", type: "number", step: "1" },
  ];

  return (
    <CrudSection
      title="Véhicules"
      subtitle="Camions rattachés aux transporteurs (tare utilisée au pesage)"
      resourceKey="vehicles"
      resource={vehiclesResource}
      fields={fields}
      schema={vehicleSchema}
      emptyValues={{ matricule: "", transporterId: "", numeroCarteGrise: "", poidsTare: "" }}
      toValues={(veh) => ({
        matricule: veh.matricule,
        transporterId: String(veh.transporterId),
        numeroCarteGrise: veh.numeroCarteGrise,
        poidsTare: num(veh.poidsTare),
      })}
      columns={[
        { header: "Matricule", render: (veh) => <span className="font-mono text-xs font-medium text-ink">{veh.matricule}</span> },
        { header: "Transporteur", render: (veh) => veh.transporterName },
        { header: "N° carte grise", render: (veh) => <span className="font-mono text-xs text-muted">{veh.numeroCarteGrise}</span> },
        { header: "Poids tare", render: (veh) => kg(veh.poidsTare) },
      ]}
    />
  );
}

function BuyersTab() {
  const fields: FieldDef[] = [
    { key: "name", label: "Nom", type: "text", placeholder: "Ets. Bennani" },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: BUYER_TYPES.map((t) => ({ value: t, label: BUYER_TYPE_LABELS[t] })),
    },
  ];
  return (
    <CrudSection
      title="Acheteurs"
      subtitle="Grossistes, mandataires, cantines scolaires, entreprises, magasins et vendeurs au détail"
      resourceKey="buyers"
      resource={buyersResource}
      fields={fields}
      schema={buyerSchema}
      emptyValues={{ name: "", type: "" }}
      toValues={(b) => ({ name: b.name, type: b.type })}
      columns={[
        { header: "Nom", render: (b) => <span className="font-medium text-ink">{b.name}</span> },
        { header: "Type", render: (b) => BUYER_TYPE_LABELS[b.type] },
      ]}
    />
  );
}

function PackagingsTab() {
  const fields: FieldDef[] = [
    {
      key: "type",
      label: "Type",
      type: "select",
      options: PACKAGING_TYPES.map((t) => ({ value: t, label: t })),
    },
    {
      key: "categorie",
      label: "Catégorie",
      type: "select",
      options: PACKAGING_CATEGORIES.map((c) => ({ value: c, label: c })),
    },
    { key: "poids", label: "Poids (kg)", type: "number", step: "0.1" },
  ];
  return (
    <CrudSection
      title="Emballages"
      subtitle="Types d'emballage et poids unitaires (max 26 palettes par camion)"
      resourceKey="packagings"
      resource={packagingsResource}
      fields={fields}
      schema={packagingSchema}
      emptyValues={{ type: "", categorie: "", poids: "" }}
      toValues={(p) => ({ type: p.type, categorie: p.categorie, poids: num(p.poids) })}
      columns={[
        { header: "Type", render: (p) => <span className="font-medium text-ink">{p.type}</span> },
        { header: "Catégorie", render: (p) => p.categorie },
        { header: "Poids", render: (p) => kg(p.poids) },
      ]}
    />
  );
}

function OwnersTab() {
  const fields: FieldDef[] = [
    { key: "name", label: "Nom", type: "text", placeholder: "Coopérative Souss Primeurs" },
    { key: "phone", label: "Téléphone", type: "text", placeholder: "0528-000000" },
  ];
  return (
    <CrudSection
      title="Propriétaires de marchandises"
      subtitle="Producteurs et coopératives propriétaires des marchandises livrées"
      resourceKey="merchandise-owners"
      resource={merchandiseOwnersResource}
      fields={fields}
      schema={merchandiseOwnerSchema}
      emptyValues={{ name: "", phone: "" }}
      toValues={(o) => ({ name: o.name, phone: o.phone })}
      columns={[
        { header: "Nom", render: (o) => <span className="font-medium text-ink">{o.name}</span> },
        { header: "Téléphone", render: (o) => o.phone },
      ]}
    />
  );
}

const TABS = [
  { id: "articles", label: "Articles", component: ArticlesTab },
  { id: "transporteurs", label: "Transporteurs", component: TransportersTab },
  { id: "vehicules", label: "Véhicules", component: VehiclesTab },
  { id: "acheteurs", label: "Acheteurs", component: BuyersTab },
  { id: "emballages", label: "Emballages", component: PackagingsTab },
  { id: "proprietaires", label: "Propriétaires", component: OwnersTab },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ReferentielsPage() {
  const [tab, setTab] = useState<TabId>("articles");
  const active = TABS.find((t) => t.id === tab) ?? TABS[0];
  const Active = active.component;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Référentiels</h1>
        <p className="text-sm text-muted">
          Données de base du marché : articles, transporteurs, véhicules, acheteurs, emballages et propriétaires.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3.5 py-1.5 text-sm transition-colors ${
              t.id === tab ? "bg-primary font-medium text-white" : "text-muted hover:bg-primary-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Active />
    </div>
  );
}
