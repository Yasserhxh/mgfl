using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MGFL.Domain.Entities;
using MGFL.Domain.Enums;
using MGFL.Domain.Services;
using MGFL.Infrastructure.Persistence;

namespace MGFL.Api.Controllers;

[ApiController]
[Route("api/infractions")]
[Authorize] // historique visible par tous les authentifiés ; constat réservé à l'agent PàB
public class InfractionsController : ControllerBase
{
    private readonly MgflDbContext _db;
    public InfractionsController(MgflDbContext db) => _db = db;

    public record InfractionRequest(InfractionType Type, decimal TaxAmount, decimal UndeclaredWeight, decimal ArticlePrice);
    public record RecordInfractionRequest(string Matricule, InfractionType Type, decimal TaxAmount, decimal UndeclaredWeight, decimal ArticlePrice);
    public record InfractionDto(string Reference, string Matricule, string Type, decimal Amount, string Date);

    private static decimal Compute(InfractionType type, decimal taxAmount, decimal undeclaredWeight, decimal articlePrice) => type switch
    {
        InfractionType.Evasion => InfractionCalculator.Evasion(taxAmount),
        InfractionType.ManqueDeclaration => InfractionCalculator.ManqueDeclaration(undeclaredWeight, articlePrice),
        InfractionType.EmballageDifferent => InfractionCalculator.EmballageDifferent(taxAmount),
        _ => 0m,
    };

    private static InfractionDto Map(Infraction i) => new(
        i.Reference ?? i.Id.ToString(), i.Matricule ?? "—", i.Type.ToString(), i.Amount,
        i.CreatedAt.ToLocalTime().ToString("dd/MM HH:mm"));

    /// <summary>Calcule le montant d'une infraction selon son type (facteur ×2), sans persistance.</summary>
    [Authorize(Policy = Roles.AgentPontBascule)]
    [HttpPost("compute")]
    public IActionResult ComputeOnly([FromBody] InfractionRequest r)
        => Ok(new { type = r.Type.ToString(), amount = Compute(r.Type, r.TaxAmount, r.UndeclaredWeight, r.ArticlePrice) });

    /// <summary>Historique des infractions constatées.</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var items = await _db.Infractions.OrderByDescending(i => i.CreatedAt).ToListAsync(ct);
        return Ok(items.Select(Map));
    }

    /// <summary>Constate et persiste une infraction (montant calculé côté serveur).</summary>
    [Authorize(Policy = Roles.AgentPontBascule)]
    [HttpPost]
    public async Task<IActionResult> Record([FromBody] RecordInfractionRequest r, CancellationToken ct)
    {
        var amount = Compute(r.Type, r.TaxAmount, r.UndeclaredWeight, r.ArticlePrice);
        var infraction = new Infraction
        {
            Reference = await NextReferenceAsync(ct),
            Matricule = r.Matricule,
            Type = r.Type,
            Amount = amount,
        };
        _db.Infractions.Add(infraction);
        await _db.SaveChangesAsync(ct);
        return Ok(Map(infraction));
    }

    private async Task<string> NextReferenceAsync(CancellationToken ct)
    {
        var refs = await _db.Infractions.Select(i => i.Reference).ToListAsync(ct);
        var max = refs
            .Select(c => int.TryParse(c?.Split('-').LastOrDefault(), out var n) ? n : 0)
            .DefaultIfEmpty(10)
            .Max();
        return $"INF-2026-{max + 1:000}";
    }
}
