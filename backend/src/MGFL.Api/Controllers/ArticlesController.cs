using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MGFL.Domain.Entities;
using MGFL.Domain.Services;
using MGFL.Infrastructure.Persistence;

namespace MGFL.Api.Controllers;

[ApiController]
[Route("api/articles")]
[Authorize] // référentiel en lecture : tout utilisateur authentifié
public class ArticlesController : ControllerBase
{
    private readonly MgflDbContext _db;
    public ArticlesController(MgflDbContext db) => _db = db;

    public record SaveArticleRequest(
        string Code, string Name, string? Famille,
        decimal ReferenceWeightPerCrate, decimal ReferencePrice, decimal TaxUnitPrice);

    private static object Map(Article a) => new
    {
        a.Id, a.Code, a.Name, a.Famille,
        a.ReferenceWeightPerCrate, a.ReferencePrice, a.TaxUnitPrice
    };

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var items = await _db.Articles.OrderBy(a => a.Name).ToListAsync(ct);
        return Ok(items.Select(Map));
    }

    [Authorize(Policy = Roles.Admin)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveArticleRequest req, CancellationToken ct)
    {
        var problem = await ValidateAsync(req, null, ct);
        if (problem is not null) return problem;
        var a = new Article
        {
            Code = req.Code.Trim().ToUpperInvariant(),
            Name = req.Name.Trim(),
            Famille = req.Famille?.Trim(),
            ReferenceWeightPerCrate = req.ReferenceWeightPerCrate,
            ReferencePrice = req.ReferencePrice,
            TaxUnitPrice = req.TaxUnitPrice,
        };
        _db.Articles.Add(a);
        await _db.SaveChangesAsync(ct);
        return Ok(Map(a));
    }

    [Authorize(Policy = Roles.Admin)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveArticleRequest req, CancellationToken ct)
    {
        var a = await _db.Articles.FindAsync(new object[] { id }, ct);
        if (a is null) return NotFound();
        var problem = await ValidateAsync(req, id, ct);
        if (problem is not null) return problem;
        a.Code = req.Code.Trim().ToUpperInvariant();
        a.Name = req.Name.Trim();
        a.Famille = req.Famille?.Trim();
        a.ReferenceWeightPerCrate = req.ReferenceWeightPerCrate;
        a.ReferencePrice = req.ReferencePrice;
        a.TaxUnitPrice = req.TaxUnitPrice;
        a.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(Map(a));
    }

    [Authorize(Policy = Roles.Admin)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var a = await _db.Articles.FindAsync(new object[] { id }, ct);
        if (a is null) return NotFound();
        if (await _db.EtatDeBaseLines.AnyAsync(l => l.ArticleId == id, ct))
            return Conflict("Des états de base référencent cet article.");
        _db.Articles.Remove(a);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<IActionResult?> ValidateAsync(SaveArticleRequest req, Guid? id, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Code) || string.IsNullOrWhiteSpace(req.Name))
            return BadRequest("Code et nom sont requis.");
        if (req.ReferenceWeightPerCrate < 0 || req.ReferencePrice < 0 || req.TaxUnitPrice < 0)
            return BadRequest("Les poids et prix doivent être positifs.");
        var code = req.Code.Trim().ToUpperInvariant();
        if (await _db.Articles.AnyAsync(a => a.Code == code && a.Id != id, ct))
            return Conflict($"Le code article {code} existe déjà.");
        return null;
    }
}

[ApiController]
[Route("api/taxe")]
[Authorize(Policy = Roles.AgentPontBascule)]
public class TaxController : ControllerBase
{
    public record TaxPreviewRequest(decimal GrossWeight, decimal EmptyTareWeight, decimal PackagingWeight, decimal TaxUnitPrice);

    /// <summary>Aperçu rapide de la taxe (cas pesée simple).</summary>
    [HttpPost("preview")]
    public IActionResult Preview([FromBody] TaxPreviewRequest r)
    {
        var net = TaxCalculator.NetWeight(r.GrossWeight, r.EmptyTareWeight, r.PackagingWeight);
        var tax = TaxCalculator.Tax(net, r.TaxUnitPrice);
        return Ok(new { netWeight = net, tax });
    }
}
