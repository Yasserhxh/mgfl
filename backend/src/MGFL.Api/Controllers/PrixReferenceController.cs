using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MGFL.Domain.Entities;
using MGFL.Infrastructure.Persistence;

namespace MGFL.Api.Controllers;

[ApiController]
[Route("api/prix-reference")]
[Authorize] // lecture pour tous les authentifiés ; publication réservée à la commission
public class PrixReferenceController : ControllerBase
{
    private readonly MgflDbContext _db;
    public PrixReferenceController(MgflDbContext db) => _db = db;

    public record PriceRowDto(string Code, string Name, decimal Min, decimal Max, decimal TaxRate);
    public record PublishRequest(List<PriceRowDto> Rows);

    /// <summary>Grille courante — dernières bornes min/max et prix de la taxe par article.</summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var articles = await _db.Articles.OrderBy(a => a.Name).ToListAsync(ct);
        var history = await _db.ReferencePrices.ToListAsync(ct);

        var rows = articles.Select(a =>
        {
            var latest = history.Where(h => h.ArticleId == a.Id).OrderByDescending(h => h.DateEffet).FirstOrDefault();
            return new PriceRowDto(
                a.Code, a.Name,
                latest?.PrixMin ?? a.ReferencePrice,
                latest?.PrixMax ?? a.ReferencePrice,
                latest?.PrixUnitaireTaxe ?? a.TaxUnitPrice);
        });
        return Ok(rows);
    }

    /// <summary>Publie la grille de la semaine : archive l'historique et met à jour les articles.</summary>
    [Authorize(Policy = Roles.CommissionPrix)]
    [HttpPut]
    public async Task<IActionResult> Publish([FromBody] PublishRequest req, CancellationToken ct)
    {
        var articles = await _db.Articles.ToDictionaryAsync(a => a.Code, ct);
        var effet = DateOnly.FromDateTime(DateTime.UtcNow);

        foreach (var row in req.Rows)
        {
            if (row.Max < row.Min) return BadRequest($"Article {row.Code} : prix max < prix min.");
            if (!articles.TryGetValue(row.Code, out var art)) continue;

            _db.ReferencePrices.Add(new ReferencePriceHistory
            {
                ArticleId = art.Id,
                PrixMin = row.Min,
                PrixMax = row.Max,
                PrixUnitaireTaxe = row.TaxRate,
                DateEffet = effet,
            });
            art.ReferencePrice = Math.Round((row.Min + row.Max) / 2m, 2);
            art.TaxUnitPrice = row.TaxRate;
            art.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
        return await Get(ct);
    }
}
