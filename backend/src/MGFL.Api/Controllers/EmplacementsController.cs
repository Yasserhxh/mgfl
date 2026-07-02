using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MGFL.Domain.Entities;
using MGFL.Domain.Enums;
using MGFL.Infrastructure.Persistence;

namespace MGFL.Api.Controllers;

[ApiController]
[Route("api/emplacements")]
[Authorize] // plan des emplacements visible par tous les authentifiés ; modification par l'agent d'organisation
public class EmplacementsController : ControllerBase
{
    private readonly MgflDbContext _db;
    public EmplacementsController(MgflDbContext db) => _db = db;

    public record SpotDto(string Id, string Store, string Bay, string Status, string? Matricule, string? ReservedBy, decimal? Fee);
    public record UpdateSpotRequest(string Status, string? Matricule, string? ReservedBy, decimal? Fee);

    public static string StatusLabel(SpotStatus s) => s switch
    {
        SpotStatus.Libre => "Libre",
        SpotStatus.Occupe => "Occupé",
        SpotStatus.Reserve => "Réservé",
        _ => s.ToString(),
    };

    private static SpotDto Map(ParkingSpot s) => new(
        s.Id.ToString(), s.Premises.Code, s.Code, StatusLabel(s.Status),
        s.OccupiedByMatricule, s.ReservedBy, s.ReservationFee);

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var spots = await _db.ParkingSpots.Include(s => s.Premises)
            .OrderBy(s => s.Premises.Code).ThenBy(s => s.Code).ToListAsync(ct);
        return Ok(spots.Select(Map));
    }

    [Authorize(Policy = Roles.AgentOrganisation)]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSpotRequest req, CancellationToken ct)
    {
        var spot = await _db.ParkingSpots.Include(s => s.Premises).FirstOrDefaultAsync(s => s.Id == id, ct);
        if (spot is null) return NotFound();

        spot.Status = req.Status switch
        {
            "Occupé" => SpotStatus.Occupe,
            "Réservé" => SpotStatus.Reserve,
            _ => SpotStatus.Libre,
        };
        spot.OccupiedByMatricule = spot.Status == SpotStatus.Occupe ? req.Matricule : null;
        spot.ReservedBy = spot.Status == SpotStatus.Reserve ? req.ReservedBy : null;
        spot.ReservationFee = spot.Status == SpotStatus.Reserve ? req.Fee : null;
        spot.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);
        return Ok(Map(spot));
    }
}
