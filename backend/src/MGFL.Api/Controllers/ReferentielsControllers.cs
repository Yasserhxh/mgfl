using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MGFL.Domain.Entities;
using MGFL.Domain.Enums;
using MGFL.Infrastructure.Persistence;

namespace MGFL.Api.Controllers;

// Référentiels (master data) : lecture pour tout utilisateur authentifié,
// écriture réservée au rôle Admin (cf. CLAUDE.md §8).

[ApiController]
[Route("api/transporters")]
[Authorize]
public class TransportersController : ControllerBase
{
    private readonly MgflDbContext _db;
    public TransportersController(MgflDbContext db) => _db = db;

    public record TransporterDto(Guid Id, string Name, string? Phone, string Direction);
    public record SaveTransporterRequest(string Name, string? Phone, TransporterDirection Direction);

    private static TransporterDto Map(Transporter t) => new(t.Id, t.Name, t.Phone, t.Direction.ToString());

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => Ok((await _db.Transporters.OrderBy(t => t.Name).ToListAsync(ct)).Select(Map));

    [Authorize(Policy = Roles.Admin)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveTransporterRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Le nom est requis.");
        var t = new Transporter { Name = req.Name.Trim(), Phone = req.Phone?.Trim(), Direction = req.Direction };
        _db.Transporters.Add(t);
        await _db.SaveChangesAsync(ct);
        return Ok(Map(t));
    }

    [Authorize(Policy = Roles.Admin)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveTransporterRequest req, CancellationToken ct)
    {
        var t = await _db.Transporters.FindAsync(new object[] { id }, ct);
        if (t is null) return NotFound();
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Le nom est requis.");
        (t.Name, t.Phone, t.Direction) = (req.Name.Trim(), req.Phone?.Trim(), req.Direction);
        t.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        return Ok(Map(t));
    }

    [Authorize(Policy = Roles.Admin)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var t = await _db.Transporters.FindAsync(new object[] { id }, ct);
        if (t is null) return NotFound();
        if (await _db.Vehicles.AnyAsync(v => v.TransporterId == id, ct))
            return Conflict("Des véhicules sont rattachés à ce transporteur.");
        _db.Transporters.Remove(t);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/vehicles")]
[Authorize]
public class VehiclesController : ControllerBase
{
    private readonly MgflDbContext _db;
    public VehiclesController(MgflDbContext db) => _db = db;

    public record VehicleDto(Guid Id, string Matricule, Guid TransporterId, string TransporterName, string? NumeroCarteGrise, decimal PoidsTare);
    public record SaveVehicleRequest(string Matricule, Guid TransporterId, string? NumeroCarteGrise, decimal PoidsTare);

    private static VehicleDto Map(Vehicle v) => new(v.Id, v.Matricule, v.TransporterId, v.Transporter.Name, v.NumeroCarteGrise, v.PoidsTare);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => Ok((await _db.Vehicles.Include(v => v.Transporter).OrderBy(v => v.Matricule).ToListAsync(ct)).Select(Map));

    [Authorize(Policy = Roles.Admin)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveVehicleRequest req, CancellationToken ct)
    {
        var problem = await ValidateAsync(req, ct);
        if (problem is not null) return problem;
        var v = new Vehicle
        {
            Matricule = req.Matricule.Trim(),
            TransporterId = req.TransporterId,
            NumeroCarteGrise = req.NumeroCarteGrise?.Trim(),
            PoidsTare = req.PoidsTare,
        };
        _db.Vehicles.Add(v);
        await _db.SaveChangesAsync(ct);
        await _db.Entry(v).Reference(x => x.Transporter).LoadAsync(ct);
        return Ok(Map(v));
    }

    [Authorize(Policy = Roles.Admin)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveVehicleRequest req, CancellationToken ct)
    {
        var v = await _db.Vehicles.Include(x => x.Transporter).FirstOrDefaultAsync(x => x.Id == id, ct);
        if (v is null) return NotFound();
        var problem = await ValidateAsync(req, ct);
        if (problem is not null) return problem;
        v.Matricule = req.Matricule.Trim();
        v.TransporterId = req.TransporterId;
        v.NumeroCarteGrise = req.NumeroCarteGrise?.Trim();
        v.PoidsTare = req.PoidsTare;
        v.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync(ct);
        await _db.Entry(v).Reference(x => x.Transporter).LoadAsync(ct);
        return Ok(Map(v));
    }

    [Authorize(Policy = Roles.Admin)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var v = await _db.Vehicles.FindAsync(new object[] { id }, ct);
        if (v is null) return NotFound();
        _db.Vehicles.Remove(v);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private async Task<IActionResult?> ValidateAsync(SaveVehicleRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Matricule)) return BadRequest("Le matricule est requis.");
        if (req.PoidsTare < 0) return BadRequest("Le poids tare doit être positif.");
        if (!await _db.Transporters.AnyAsync(t => t.Id == req.TransporterId, ct))
            return BadRequest("Transporteur introuvable.");
        return null;
    }
}

[ApiController]
[Route("api/buyers")]
[Authorize]
public class BuyersController : ControllerBase
{
    private readonly MgflDbContext _db;
    public BuyersController(MgflDbContext db) => _db = db;

    public record BuyerDto(Guid Id, string Name, string Type);
    public record SaveBuyerRequest(string Name, BuyerType Type);

    private static BuyerDto Map(Buyer x) => new(x.Id, x.Name, x.Type.ToString());

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => Ok((await _db.Buyers.OrderBy(x => x.Name).ToListAsync(ct)).Select(Map));

    [Authorize(Policy = Roles.Admin)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveBuyerRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Le nom est requis.");
        var b = new Buyer { Name = req.Name.Trim(), Type = req.Type };
        _db.Buyers.Add(b);
        await _db.SaveChangesAsync(ct);
        return Ok(Map(b));
    }

    [Authorize(Policy = Roles.Admin)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveBuyerRequest req, CancellationToken ct)
    {
        var b = await _db.Buyers.FindAsync(new object[] { id }, ct);
        if (b is null) return NotFound();
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Le nom est requis.");
        (b.Name, b.Type, b.UpdatedAt) = (req.Name.Trim(), req.Type, DateTimeOffset.UtcNow);
        await _db.SaveChangesAsync(ct);
        return Ok(Map(b));
    }

    [Authorize(Policy = Roles.Admin)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var b = await _db.Buyers.FindAsync(new object[] { id }, ct);
        if (b is null) return NotFound();
        _db.Buyers.Remove(b);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/packagings")]
[Authorize]
public class PackagingsController : ControllerBase
{
    private readonly MgflDbContext _db;
    public PackagingsController(MgflDbContext db) => _db = db;

    public record PackagingDto(Guid Id, string Type, string Categorie, decimal Poids);
    public record SavePackagingRequest(PackagingType Type, PackagingCategory Categorie, decimal Poids);

    private static PackagingDto Map(Packaging x) => new(x.Id, x.Type.ToString(), x.Categorie.ToString(), x.Poids);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => Ok((await _db.Packagings.OrderBy(x => x.Type).ThenBy(x => x.Categorie).ToListAsync(ct)).Select(Map));

    [Authorize(Policy = Roles.Admin)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SavePackagingRequest req, CancellationToken ct)
    {
        if (req.Poids < 0) return BadRequest("Le poids doit être positif.");
        var p = new Packaging { Type = req.Type, Categorie = req.Categorie, Poids = req.Poids };
        _db.Packagings.Add(p);
        await _db.SaveChangesAsync(ct);
        return Ok(Map(p));
    }

    [Authorize(Policy = Roles.Admin)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SavePackagingRequest req, CancellationToken ct)
    {
        var p = await _db.Packagings.FindAsync(new object[] { id }, ct);
        if (p is null) return NotFound();
        if (req.Poids < 0) return BadRequest("Le poids doit être positif.");
        (p.Type, p.Categorie, p.Poids, p.UpdatedAt) = (req.Type, req.Categorie, req.Poids, DateTimeOffset.UtcNow);
        await _db.SaveChangesAsync(ct);
        return Ok(Map(p));
    }

    [Authorize(Policy = Roles.Admin)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var p = await _db.Packagings.FindAsync(new object[] { id }, ct);
        if (p is null) return NotFound();
        _db.Packagings.Remove(p);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/merchandise-owners")]
[Authorize]
public class MerchandiseOwnersController : ControllerBase
{
    private readonly MgflDbContext _db;
    public MerchandiseOwnersController(MgflDbContext db) => _db = db;

    public record OwnerDto(Guid Id, string Name, string? Phone);
    public record SaveOwnerRequest(string Name, string? Phone);

    private static OwnerDto Map(MerchandiseOwner x) => new(x.Id, x.Name, x.Phone);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => Ok((await _db.MerchandiseOwners.OrderBy(x => x.Name).ToListAsync(ct)).Select(Map));

    [Authorize(Policy = Roles.Admin)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SaveOwnerRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Le nom est requis.");
        var o = new MerchandiseOwner { Name = req.Name.Trim(), Phone = req.Phone?.Trim() };
        _db.MerchandiseOwners.Add(o);
        await _db.SaveChangesAsync(ct);
        return Ok(Map(o));
    }

    [Authorize(Policy = Roles.Admin)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] SaveOwnerRequest req, CancellationToken ct)
    {
        var o = await _db.MerchandiseOwners.FindAsync(new object[] { id }, ct);
        if (o is null) return NotFound();
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Le nom est requis.");
        (o.Name, o.Phone, o.UpdatedAt) = (req.Name.Trim(), req.Phone?.Trim(), DateTimeOffset.UtcNow);
        await _db.SaveChangesAsync(ct);
        return Ok(Map(o));
    }

    [Authorize(Policy = Roles.Admin)]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var o = await _db.MerchandiseOwners.FindAsync(new object[] { id }, ct);
        if (o is null) return NotFound();
        _db.MerchandiseOwners.Remove(o);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
