using MGFL.Domain.Enums;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using EtatDeBaseEntity = MGFL.Domain.Entities.EtatDeBase;

namespace MGFL.Api.Documents;

/// <summary>
/// Document fiscal/logistique imprimé au pont à bascule et remis au transporteur
/// contre la carte grise (CLAUDE.md §6.2). Mise en page A4, palette de la marque.
/// </summary>
public class EtatDeBasePdfDocument : IDocument
{
    private const string Primary = "#1A7F37";
    private const string Ink = "#111113";
    private const string Muted = "#71717A";
    private const string Line = "#E4E4E7";

    private readonly EtatDeBaseEntity _etat;
    private readonly string _matricule;
    private readonly string? _transporteur;
    private readonly string? _magasin;

    public EtatDeBasePdfDocument(EtatDeBaseEntity etat, string matricule, string? transporteur, string? magasin)
    {
        _etat = etat;
        _matricule = matricule;
        _transporteur = transporteur;
        _magasin = magasin;
    }

    public DocumentMetadata GetMetadata() => new() { Title = $"État de base {_etat.Number}" };

    public void Compose(IDocumentContainer container) => container.Page(page =>
    {
        page.Size(PageSizes.A4);
        page.Margin(40);
        page.DefaultTextStyle(t => t.FontSize(10).FontColor(Ink));

        page.Header().Element(ComposeHeader);
        page.Content().PaddingVertical(16).Element(ComposeContent);
        page.Footer().Element(ComposeFooter);
    });

    private void ComposeHeader(IContainer container) => container.Row(row =>
    {
        row.RelativeItem().Column(col =>
        {
            col.Item().Text("MGFL — Marché de Gros de Fruits et Légumes").Bold().FontSize(14).FontColor(Primary);
            col.Item().Text("Casablanca · Pont à Bascule").FontColor(Muted);
        });
        row.ConstantItem(190).Column(col =>
        {
            col.Item().AlignRight().Text("ÉTAT DE BASE").Bold().FontSize(13);
            col.Item().AlignRight().Text(_etat.Number).FontSize(12).FontColor(Primary).Bold();
            col.Item().AlignRight().Text(_etat.CreatedAt.ToLocalTime().ToString("dd/MM/yyyy HH:mm")).FontColor(Muted);
        });
    });

    private void ComposeContent(IContainer container) => container.Column(col =>
    {
        col.Spacing(14);

        // Bloc voyage.
        col.Item().Border(1).BorderColor(Line).Padding(10).Row(row =>
        {
            row.RelativeItem().Column(c =>
            {
                c.Item().Text("Matricule").FontColor(Muted).FontSize(8);
                c.Item().Text(_matricule).Bold();
            });
            row.RelativeItem().Column(c =>
            {
                c.Item().Text("Transporteur").FontColor(Muted).FontSize(8);
                c.Item().Text(_transporteur ?? "—").Bold();
            });
            row.RelativeItem().Column(c =>
            {
                c.Item().Text("Magasin réceptionnaire").FontColor(Muted).FontSize(8);
                c.Item().Text(_magasin ?? "—").Bold();
            });
            row.RelativeItem().Column(c =>
            {
                c.Item().Text("Statut").FontColor(Muted).FontSize(8);
                c.Item().Text(StatusLabel(_etat.Status)).Bold();
            });
        });

        // Lignes par article.
        col.Item().Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.RelativeColumn(3);   // article
                c.RelativeColumn(1);   // caisses
                c.RelativeColumn(2);   // poids net
                c.RelativeColumn(2);   // prix réf.
                c.RelativeColumn(2);   // valeur
                c.RelativeColumn(2);   // taxe
            });

            table.Header(header =>
            {
                foreach (var title in new[] { "Article", "Caisses", "Poids net (kg)", "Prix réf. (MAD/kg)", "Valeur (MAD)", "Taxe (MAD)" })
                    header.Cell().Background(Primary).Padding(6)
                        .Text(title).FontColor(Colors.White).FontSize(9).Bold();
            });

            foreach (var line in _etat.Lines)
            {
                var label = line.Article?.Name ?? "Article";
                table.Cell().BorderBottom(1).BorderColor(Line).Padding(6).Text(label);
                table.Cell().BorderBottom(1).BorderColor(Line).Padding(6).Text(line.NbCrates?.ToString() ?? "—");
                table.Cell().BorderBottom(1).BorderColor(Line).Padding(6).Text($"{line.NetWeight:N3}");
                table.Cell().BorderBottom(1).BorderColor(Line).Padding(6).Text($"{line.ReferencePrice:N2}");
                table.Cell().BorderBottom(1).BorderColor(Line).Padding(6).Text($"{line.MerchandiseValue:N2}");
                table.Cell().BorderBottom(1).BorderColor(Line).Padding(6).Text($"{line.AdValoremTax:N2}");
            }
        });

        // Totaux.
        col.Item().AlignRight().Column(totals =>
        {
            totals.Item().Text($"Poids net total : {_etat.TotalNetWeight:N3} kg");
            totals.Item().Text($"Valeur marchandise : {_etat.TotalMerchandiseValue:N2} MAD");
            totals.Item().Text($"Taxe totale : {_etat.TotalTax:N2} MAD").Bold().FontSize(12).FontColor(Primary);
        });

        // Cadre accusé de réception (cachet humide du magasin).
        col.Item().PaddingTop(10).Row(row =>
        {
            row.RelativeItem().Border(1).BorderColor(Line).Height(90).Padding(8)
                .Text("Accusé de réception du magasin (cachet humide)").FontColor(Muted).FontSize(8);
            row.ConstantItem(16);
            row.RelativeItem().Border(1).BorderColor(Line).Height(90).Padding(8)
                .Text("Agent du Pont à Bascule (signature)").FontColor(Muted).FontSize(8);
        });
    });

    private void ComposeFooter(IContainer container) => container.Row(row =>
    {
        row.RelativeItem().Text("Document remis au transporteur contre la carte grise.")
            .FontColor(Muted).FontSize(8);
        row.ConstantItem(80).AlignRight().Text(t =>
        {
            t.DefaultTextStyle(s => s.FontColor(Muted).FontSize(8));
            t.Span("Page ");
            t.CurrentPageNumber();
            t.Span(" / ");
            t.TotalPages();
        });
    });

    public static string StatusLabel(EtatDeBaseStatus status) => status switch
    {
        EtatDeBaseStatus.Brouillon => "Brouillon",
        EtatDeBaseStatus.Bloque => "Bloqué",
        EtatDeBaseStatus.Genere => "Généré",
        EtatDeBaseStatus.Imprime => "Imprimé",
        EtatDeBaseStatus.Receptionne => "Réceptionné",
        _ => status.ToString(),
    };
}
