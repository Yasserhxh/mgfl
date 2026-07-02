using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MGFL.Domain.Entities;
using MGFL.Domain.Enums;
using MGFL.Domain.Services;
using MGFL.Infrastructure.Persistence;

namespace MGFL.Api.Controllers;

[ApiController]
[Route("api/arrivals")]
[Authorize(Policy = Roles.AgentPontBascule)]
public class ArrivalsController : ControllerBase
{
    private readonly MgflDbContext _db;
    private readonly decimal _tolerance;

    public ArrivalsController(MgflDbContext db, IConfiguration config)
    {
        _db = db;
        // Seuil de tolérance du contrôle de vraisemblance, paramétrable (CLAUDE.md §7.3).
        _tolerance = config.GetValue<decimal?>("Plausibility:Tolerance") ?? PlausibilityChecker.DefaultTolerance;
    }

    public record ArrivalLineInput(string Article, int? Crates);

    public record CreateArrivalRequest(
        string Code, decimal GrossWeight, decimal TareWeight, decimal PackagingWeight, string Magasin,
        List<ArrivalLineInput>? Lines);

    public record EtatLineDto(string Article, decimal NetWeight, decimal Value, decimal Tax, decimal TaxRate);

    public record ArrivalResultDto(
        string Code, string Matricule, string? Transporteur, string? Source, string Magasin,
        decimal GrossWeight, decimal TareWeight, decimal PackagingWeight,
        decimal NetWeight, decimal TotalValue, decimal TotalTax, IReadOnlyList<EtatLineDto> Lines,
        string EtatNumber);

    /// <summary>Pesée d'un voyage scanné : calcule la taxe par article, persiste l'arrivage et l'état de base.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateArrivalRequest req, CancellationToken ct)
    {
        var decl = await _db.PreDeclarations.Include(p => p.Lines).FirstOrDefaultAsync(p => p.QrCode == req.Code, ct);
        if (decl is null) return NotFound($"Pré-déclaration {req.Code} introuvable.");
        if (decl.Status != PreDeclarationStatus.EnAttente)
            return Conflict($"Voyage {req.Code} déjà traité.");

        var net = TaxCalculator.NetWeight(req.GrossWeight, req.TareWeight, req.PackagingWeight);
        var totalTonnage = decl.Lines.Sum(l => l.TonnageApprox);
        if (totalTonnage <= 0) return BadRequest("Tonnage déclaré nul.");

        var articles = await _db.Articles.ToDictionaryAsync(a => a.Name, ct);

        // Contrôle de vraisemblance (BLOQUANT — CLAUDE.md §7.3) : quand l'agent saisit le
        // nombre de caisses d'un article, le poids constaté par caisse doit rester dans la
        // tolérance du poids de référence, sinon rien n'est persisté.
        var crateCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var line in req.Lines ?? new List<ArrivalLineInput>())
            if (line.Crates is > 0)
                crateCounts[line.Article] = line.Crates.Value;

        var implausible = new List<string>();
        foreach (var l in decl.Lines)
        {
            if (!crateCounts.TryGetValue(l.ArticleName, out var crates)) continue;
            articles.TryGetValue(l.ArticleName, out var checkedArt);
            var shareWeight = TaxCalculator.Round3(net * (l.TonnageApprox / totalTonnage));
            var check = PlausibilityChecker.Check(
                l.ArticleName, checkedArt?.ReferenceWeightPerCrate ?? 0m, shareWeight, crates, _tolerance);
            if (!check.IsPlausible) implausible.Add(check.Reason!);
        }
        if (implausible.Count > 0)
            return Problem(
                title: "Contrôle de vraisemblance : données incohérentes.",
                detail: string.Join(" ", implausible),
                statusCode: StatusCodes.Status422UnprocessableEntity);

        var wb = await _db.Weighbridges.FirstOrDefaultAsync(ct);
        var arrival = new Arrival
        {
            PreDeclarationId = decl.Id,
            WeighbridgeId = wb?.Id ?? Guid.Empty,
            Matricule = decl.Matricule,
            GrossWeight = req.GrossWeight,
            EmptyTareWeight = req.TareWeight,
            PackagingWeight = req.PackagingWeight,
        };

        var etat = new EtatDeBase
        {
            Number = await NextEtatNumberAsync(ct),
            Status = EtatDeBaseStatus.Genere,
            TotalNetWeight = net,
        };

        var lines = new List<EtatLineDto>();
        foreach (var l in decl.Lines)
        {
            articles.TryGetValue(l.ArticleName, out var art);
            var refPrice = art?.ReferencePrice ?? 0m;
            var taxRate = art?.TaxUnitPrice ?? 0.02m;
            var share = TaxCalculator.Round3(net * (l.TonnageApprox / totalTonnage));
            var value = TaxCalculator.Round(share * refPrice);
            var tax = TaxCalculator.Round(share * taxRate);

            etat.Lines.Add(new EtatDeBaseLine
            {
                ArticleId = art?.Id ?? Guid.Empty,
                NbCrates = crateCounts.TryGetValue(l.ArticleName, out var nbCrates) ? nbCrates : null,
                NetWeight = share,
                ReferencePrice = refPrice,
                MerchandiseValue = value,
                TaxUnitPrice = taxRate,
                AdValoremTax = tax,
            });
            lines.Add(new EtatLineDto(l.ArticleName, share, value, tax, taxRate));
        }

        etat.TotalMerchandiseValue = lines.Sum(l => l.Value);
        etat.TotalTax = lines.Sum(l => l.Tax);
        arrival.EtatDeBase = etat;

        // Destination magasin (code "M-0X" éventuellement préfixé "Magasin ").
        var storeCode = req.Magasin.Replace("Magasin", "").Trim();
        var premises = await _db.Premises.Include(p => p.Spots).FirstOrDefaultAsync(p => p.Code == storeCode, ct);
        arrival.ReceivingPremisesId = premises?.Id;
        var freeSpot = premises?.Spots.FirstOrDefault(s => s.Status == SpotStatus.Libre);
        if (freeSpot is not null)
        {
            freeSpot.Status = SpotStatus.Occupe;
            freeSpot.OccupiedByMatricule = decl.Matricule;
        }

        _db.Arrivals.Add(arrival);

        decl.Status = PreDeclarationStatus.Pese;
        decl.IsConsumed = true;
        decl.PesageNetWeight = net;
        decl.PesageTax = etat.TotalTax;
        decl.Magasin = storeCode;
        decl.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);

        return Ok(new ArrivalResultDto(
            decl.QrCode, decl.Matricule, decl.Transporteur, decl.Source, storeCode,
            req.GrossWeight, req.TareWeight, req.PackagingWeight,
            net, etat.TotalMerchandiseValue, etat.TotalTax, lines, etat.Number));
    }

    /// <summary>
    /// Sortie du camion : remise de l'état de base contre récupération de la carte grise.
    /// Clôture le voyage, réceptionne l'état de base et libère automatiquement les
    /// emplacements occupés par le véhicule (CLAUDE.md §6.2 / §7.6).
    /// </summary>
    [HttpPost("{code}/depart")]
    public async Task<IActionResult> Depart(string code, CancellationToken ct)
    {
        var decl = await _db.PreDeclarations.Include(p => p.Lines).FirstOrDefaultAsync(p => p.QrCode == code, ct);
        if (decl is null) return NotFound($"Pré-déclaration {code} introuvable.");
        if (decl.Status != PreDeclarationStatus.Pese)
            return Conflict($"Voyage {code} non pesé ou déjà clôturé.");

        var arrival = await _db.Arrivals.Include(a => a.EtatDeBase)
            .FirstOrDefaultAsync(a => a.PreDeclarationId == decl.Id, ct);
        if (arrival?.EtatDeBase is not null)
        {
            arrival.EtatDeBase.Status = EtatDeBaseStatus.Receptionne;
            arrival.EtatDeBase.ReceivedAt = DateTimeOffset.UtcNow;
        }

        var spots = await _db.ParkingSpots
            .Where(s => s.OccupiedByMatricule == decl.Matricule && s.Status == SpotStatus.Occupe)
            .ToListAsync(ct);
        foreach (var spot in spots)
        {
            spot.Status = SpotStatus.Libre;
            spot.OccupiedByMatricule = null;
            spot.UpdatedAt = DateTimeOffset.UtcNow;
        }

        decl.Status = PreDeclarationStatus.Cloture;
        decl.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(PreDeclarationsController.Map(decl));
    }

    private async Task<string> NextEtatNumberAsync(CancellationToken ct)
    {
        var count = await _db.EtatsDeBase.CountAsync(ct);
        return $"EB-2026-{count + 1:0000}";
    }
}
