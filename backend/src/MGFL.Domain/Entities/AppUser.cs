using MGFL.Domain.Common;

namespace MGFL.Domain.Entities;

/// <summary>Compte utilisateur du système (RBAC, cf. CLAUDE.md §8).</summary>
public class AppUser : Entity
{
    public string Username { get; set; } = default!;
    public string FullName { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public string Role { get; set; } = Roles.Transporteur;
    public bool IsActive { get; set; } = true;
}

/// <summary>Rôles applicatifs — doivent correspondre aux policies déclarées dans l'API.</summary>
public static class Roles
{
    public const string Admin = "Admin";
    public const string AgentPontBascule = "AgentPontBascule";
    public const string AgentOrganisation = "AgentOrganisation";
    public const string CommissionPrix = "CommissionPrix";
    public const string Commercant = "Commercant";
    public const string Transporteur = "Transporteur";

    public static readonly string[] All =
        { Admin, AgentPontBascule, AgentOrganisation, CommissionPrix, Commercant, Transporteur };
}
