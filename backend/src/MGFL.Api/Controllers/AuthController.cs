using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MGFL.Api.Auth;
using MGFL.Domain.Services;
using MGFL.Infrastructure.Persistence;

namespace MGFL.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly MgflDbContext _db;
    private readonly JwtTokenService _tokens;

    public AuthController(MgflDbContext db, JwtTokenService tokens)
    {
        _db = db;
        _tokens = tokens;
    }

    public record LoginRequest(string Username, string Password);
    public record UserDto(string Username, string FullName, string Role);
    public record LoginResponse(string Token, DateTimeOffset ExpiresAt, UserDto User);

    /// <summary>Authentifie un utilisateur et délivre un JWT (validité 8 h).</summary>
    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest req, CancellationToken ct)
    {
        var username = req.Username?.Trim().ToLowerInvariant() ?? "";
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == username, ct);

        // Message unique quel que soit le champ fautif : ne pas révéler si le compte existe.
        if (user is null || !user.IsActive || !PasswordHasher.Verify(req.Password ?? "", user.PasswordHash))
            return Unauthorized(new ProblemDetails
            {
                Title = "Identifiants invalides.",
                Status = StatusCodes.Status401Unauthorized,
            });

        var (token, expiresAt) = _tokens.CreateToken(user);
        return Ok(new LoginResponse(token, expiresAt, new UserDto(user.Username, user.FullName, user.Role)));
    }

    /// <summary>Renvoie l'utilisateur du token courant (restauration de session côté front).</summary>
    [Authorize]
    [HttpGet("me")]
    public IActionResult Me() => Ok(new UserDto(
        User.Identity?.Name ?? "",
        User.FindFirstValue("fullName") ?? "",
        User.FindFirstValue(ClaimTypes.Role) ?? ""));
}
