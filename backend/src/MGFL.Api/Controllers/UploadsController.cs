using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MGFL.Api.Controllers;

/// <summary>
/// Upload des photos de marchandise (pré-déclaration mobile). Les fichiers sont
/// renommés par GUID (jamais le nom client — anti path traversal) et servis en
/// statique sous <c>/uploads/photos</c>.
/// </summary>
[ApiController]
[Route("api/uploads")]
[Authorize]
public class UploadsController : ControllerBase
{
    private const long MaxBytes = 5 * 1024 * 1024; // 5 MB

    private static readonly Dictionary<string, string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
    };

    private readonly IWebHostEnvironment _env;
    public UploadsController(IWebHostEnvironment env) => _env = env;

    [HttpPost("photos")]
    [RequestSizeLimit(MaxBytes)]
    public async Task<IActionResult> UploadPhoto(IFormFile? file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest("Aucun fichier reçu (champ « file » attendu).");
        if (file.Length > MaxBytes)
            return BadRequest("Fichier trop volumineux (5 Mo maximum).");
        if (!AllowedTypes.TryGetValue(file.ContentType, out var extension))
            return BadRequest("Format non supporté (JPEG, PNG ou WebP attendu).");

        // Même racine que le provider statique de Program.cs (ContentRoot/wwwroot),
        // indépendamment de la résolution de WebRootPath par l'hôte.
        var directory = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", "photos");
        Directory.CreateDirectory(directory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var path = Path.Combine(directory, fileName);
        await using (var stream = System.IO.File.Create(path))
            await file.CopyToAsync(stream, ct);

        return Ok(new { url = $"/uploads/photos/{fileName}" });
    }
}
