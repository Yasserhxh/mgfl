using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MGFL.Domain.Entities;
using MGFL.Domain.Enums;
using MGFL.Infrastructure.Persistence;

namespace MGFL.Api.Controllers;

[ApiController]
[Route("api/pre-declarations")]
[Authorize] // lecture : agents + transporteurs ; création réservée au Transporteur
public class PreDeclarationsController : ControllerBase
{
    private readonly MgflDbContext _db;
    public PreDeclarationsController(MgflDbContext db) => _db = db;

    public record VoyageItemDto(string Article, decimal Tonnage);

    public record PreDeclarationDto(
        string Code, string Matricule, string? Transporteur, string? Source,
        IReadOnlyList<VoyageItemDto> Items, string CreatedAt, string Status,
        decimal? NetWeight, decimal? Tax, string? Magasin);

    public record CreatePreDeclarationRequest(
        string Matricule, string? Transporteur, string? Source,
        List<VoyageItemDto> Items, string? PhotoUrl, double? Latitude, double? Longitude);

    public static string StatusLabel(PreDeclarationStatus s) => s switch
    {
        PreDeclarationStatus.EnAttente => "En attente",
        PreDeclarationStatus.Pese => "Pesé",
        PreDeclarationStatus.Cloture => "Clôturé",
        _ => s.ToString(),
    };

    internal static PreDeclarationDto Map(PreDeclaration p) => new(
        p.QrCode, p.Matricule, p.Transporteur, p.Source,
        p.Lines.Select(l => new VoyageItemDto(l.ArticleName, l.TonnageApprox)).ToList(),
        p.CreatedAt.ToLocalTime().ToString("dd/MM HH:mm"), StatusLabel(p.Status),
        p.PesageNetWeight, p.PesageTax, p.Magasin);

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? status, CancellationToken ct)
    {
        var query = _db.PreDeclarations.Include(p => p.Lines).AsQueryable();

        // Un transporteur ne voit que ses propres voyages ; les agents voient tout.
        if (User.IsInRole(Roles.Transporteur) && !User.IsInRole(Roles.Admin))
        {
            var username = User.Identity?.Name;
            query = query.Where(p => p.CreatedByUsername == username);
        }

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<PreDeclarationStatus>(status, true, out var st))
            query = query.Where(p => p.Status == st);

        var items = await query.OrderByDescending(p => p.CreatedAt).ToListAsync(ct);
        return Ok(items.Select(Map));
    }

    [HttpGet("{code}")]
    public async Task<IActionResult> GetByCode(string code, CancellationToken ct)
    {
        var p = await _db.PreDeclarations.Include(x => x.Lines).FirstOrDefaultAsync(x => x.QrCode == code, ct);
        return p is null ? NotFound() : Ok(Map(p));
    }

    [Authorize(Policy = Roles.Transporteur)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePreDeclarationRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Matricule) || req.Items is null || req.Items.Count == 0)
            return BadRequest("Matricule et au moins un article sont requis.");

        var code = await NextCodeAsync(ct);
        var decl = new PreDeclaration
        {
            QrCode = code,
            CreatedByUsername = User.Identity?.Name,
            Matricule = req.Matricule.Trim(),
            Transporteur = req.Transporteur?.Trim(),
            Source = req.Source,
            PhotoUrl = req.PhotoUrl,
            Latitude = req.Latitude,
            Longitude = req.Longitude,
            Status = PreDeclarationStatus.EnAttente,
            Lines = req.Items.Select(i => new PreDeclarationLine { ArticleName = i.Article, TonnageApprox = i.Tonnage }).ToList(),
        };
        _db.PreDeclarations.Add(decl);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetByCode), new { code }, Map(decl));
    }

    private async Task<string> NextCodeAsync(CancellationToken ct)
    {
        var codes = await _db.PreDeclarations.Select(p => p.QrCode).ToListAsync(ct);
        var max = codes
            .Select(c => int.TryParse(c.Split('-').LastOrDefault(), out var n) ? n : 0)
            .DefaultIfEmpty(44)
            .Max();
        return $"PRE-2026-{max + 1:0000}";
    }
}
