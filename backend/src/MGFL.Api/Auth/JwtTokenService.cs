using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using MGFL.Domain.Entities;

namespace MGFL.Api.Auth;

/// <summary>Émission des JWT signés (HMAC-SHA256) portant le rôle de l'utilisateur.</summary>
public class JwtTokenService
{
    public const string DevFallbackKey = "dev-only-change-me-please-32bytes-min!";
    private static readonly TimeSpan Lifetime = TimeSpan.FromHours(8);

    private readonly IConfiguration _config;
    public JwtTokenService(IConfiguration config) => _config = config;

    public (string Token, DateTimeOffset ExpiresAt) CreateToken(AppUser user)
    {
        var jwt = _config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"] ?? DevFallbackKey));
        var expiresAt = DateTimeOffset.UtcNow.Add(Lifetime);

        var token = new JwtSecurityToken(
            issuer: jwt["Issuer"] ?? "mgfl",
            audience: jwt["Audience"] ?? "mgfl-clients",
            claims: new[]
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim("fullName", user.FullName),
                new Claim(ClaimTypes.Role, user.Role),
            },
            expires: expiresAt.UtcDateTime,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
