using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MGFL.Domain.Entities;
using MGFL.Domain.Enums;
using MGFL.Infrastructure.Persistence;

namespace MGFL.Api.Controllers;

/// <summary>
/// Réservation d'emplacements par les commerçants (CLAUDE.md §6.4) : une réservation
/// pour une durée déterminée génère des frais à la charge du commerçant, au tarif
/// journalier paramétrable <c>Reservations:DailyRate</c>.
/// </summary>
[ApiController]
[Route("api/reservations")]
[Authorize] // lecture : tout utilisateur authentifié ; gestion : policy ReservationManager
public class ReservationsController : ControllerBase
{
    public const decimal DefaultDailyRate = 250m;

    private readonly MgflDbContext _db;
    private readonly decimal _dailyRate;

    public ReservationsController(MgflDbContext db, IConfiguration config)
    {
        _db = db;
        _dailyRate = config.GetValue<decimal?>("Reservations:DailyRate") ?? DefaultDailyRate;
    }

    public record ReservationDto(
        Guid Id, Guid SpotId, string Store, string Bay, string Merchant,
        string Debut, string Fin, int Days, decimal Fee, string Status);

    public record CreateReservationRequest(Guid SpotId, string Merchant, DateOnly Debut, DateOnly Fin);

    private static ReservationDto Map(SpotReservation r) => new(
        r.Id, r.ParkingSpotId, r.ParkingSpot.Premises.Code, r.ParkingSpot.Code, r.Merchant,
        r.Debut.ToString("yyyy-MM-dd"), r.Fin.ToString("yyyy-MM-dd"),
        SpotReservation.BilledDays(r.Debut, r.Fin), r.Fee,
        r.Status == ReservationStatus.Active ? "Active" : "Terminée");

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var items = await _db.SpotReservations
            .Include(r => r.ParkingSpot).ThenInclude(s => s.Premises)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
        return Ok(items.Select(Map));
    }

    [Authorize(Policy = "ReservationManager")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateReservationRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Merchant)) return BadRequest("Le commerçant est requis.");
        if (req.Fin < req.Debut) return BadRequest("La date de fin doit être postérieure ou égale à la date de début.");

        var spot = await _db.ParkingSpots.Include(s => s.Premises).FirstOrDefaultAsync(s => s.Id == req.SpotId, ct);
        if (spot is null) return NotFound("Emplacement introuvable.");
        if (spot.Status != SpotStatus.Libre)
            return Conflict($"L'emplacement {spot.Premises.Code}/{spot.Code} n'est pas libre.");

        var reservation = new SpotReservation
        {
            ParkingSpot = spot,
            Merchant = req.Merchant.Trim(),
            Debut = req.Debut,
            Fin = req.Fin,
            Fee = SpotReservation.ComputeFee(req.Debut, req.Fin, _dailyRate),
        };
        _db.SpotReservations.Add(reservation);

        spot.Status = SpotStatus.Reserve;
        spot.ReservedBy = reservation.Merchant;
        spot.ReservationFee = reservation.Fee;
        spot.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);
        return Ok(Map(reservation));
    }

    /// <summary>Termine la réservation et libère l'emplacement.</summary>
    [Authorize(Policy = "ReservationManager")]
    [HttpPost("{id:guid}/end")]
    public async Task<IActionResult> End(Guid id, CancellationToken ct)
    {
        var reservation = await _db.SpotReservations
            .Include(r => r.ParkingSpot).ThenInclude(s => s.Premises)
            .FirstOrDefaultAsync(r => r.Id == id, ct);
        if (reservation is null) return NotFound();
        if (reservation.Status != ReservationStatus.Active) return Conflict("Réservation déjà terminée.");

        reservation.Status = ReservationStatus.Terminee;
        reservation.UpdatedAt = DateTimeOffset.UtcNow;

        var spot = reservation.ParkingSpot;
        if (spot.Status == SpotStatus.Reserve)
        {
            spot.Status = SpotStatus.Libre;
            spot.ReservedBy = null;
            spot.ReservationFee = null;
            spot.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
        return Ok(Map(reservation));
    }
}
