using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MGFL.Api.Documents;
using MGFL.Application.EtatDeBase;
using MGFL.Domain.Entities;
using MGFL.Domain.Enums;
using MGFL.Infrastructure.Persistence;
using QuestPDF.Fluent;

namespace MGFL.Api.Controllers;

[ApiController]
[Route("api/etats-de-base")]
[Authorize]
public class EtatDeBaseController : ControllerBase
{
    private readonly ISender _sender;
    private readonly MgflDbContext _db;

    public EtatDeBaseController(ISender sender, MgflDbContext db)
    {
        _sender = sender;
        _db = db;
    }

    public record EtatSummaryDto(
        string Number, DateTimeOffset Date, string Matricule, string? Magasin,
        decimal TotalNetWeight, decimal TotalMerchandiseValue, decimal TotalTax, string Status);

    /// <summary>
    /// Génère un état de base à partir des lignes pesées.
    /// Renvoie 200 avec le détail, ou 422 si le contrôle de vraisemblance bloque la génération.
    /// </summary>
    [Authorize(Policy = Roles.AgentPontBascule)]
    [HttpPost("generate")]
    [ProducesResponseType(typeof(EtatDeBaseResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(EtatDeBaseResponse), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Generate([FromBody] EtatDeBaseRequest request, CancellationToken ct)
    {
        var result = await _sender.Send(new GenerateEtatDeBaseCommand(request), ct);
        return result.IsBlocked ? UnprocessableEntity(result) : Ok(result);
    }

    /// <summary>Liste des états de base générés (documents).</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var items = await _db.EtatsDeBase
            .Include(e => e.Arrival).ThenInclude(a => a.ReceivingPremises)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync(ct);

        return Ok(items.Select(e => new EtatSummaryDto(
            e.Number, e.CreatedAt, e.Arrival.Matricule, e.Arrival.ReceivingPremises?.Code,
            e.TotalNetWeight, e.TotalMerchandiseValue, e.TotalTax,
            EtatDeBasePdfDocument.StatusLabel(e.Status))));
    }

    /// <summary>Document PDF de l'état de base — marque le document comme imprimé.</summary>
    [Authorize(Policy = Roles.AgentPontBascule)]
    [HttpGet("{number}/pdf")]
    [Produces("application/pdf")]
    public async Task<IActionResult> Pdf(string number, CancellationToken ct)
    {
        var etat = await _db.EtatsDeBase
            .Include(e => e.Lines).ThenInclude(l => l.Article)
            .Include(e => e.Arrival).ThenInclude(a => a.ReceivingPremises)
            .FirstOrDefaultAsync(e => e.Number == number, ct);
        if (etat is null) return NotFound($"État de base {number} introuvable.");

        var decl = etat.Arrival.PreDeclarationId is Guid declId
            ? await _db.PreDeclarations.FindAsync(new object[] { declId }, ct)
            : null;

        var pdf = new EtatDeBasePdfDocument(
            etat, etat.Arrival.Matricule, decl?.Transporteur, etat.Arrival.ReceivingPremises?.Code)
            .GeneratePdf();

        // Suivi du statut d'impression (spec §5 — "statut impression").
        if (etat.Status == EtatDeBaseStatus.Genere)
            etat.Status = EtatDeBaseStatus.Imprime;
        etat.PrintedAt ??= DateTimeOffset.UtcNow;
        etat.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        return File(pdf, "application/pdf", $"etat-de-base-{number}.pdf");
    }
}
