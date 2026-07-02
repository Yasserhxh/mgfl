using System.Text;
using System.Text.Json.Serialization;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MGFL.Api.Auth;
using MGFL.Application.Common;
using MGFL.Domain.Entities;
using MGFL.Infrastructure;
using MGFL.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// --- Services ---
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(o =>
{
    // Bouton "Authorize" dans Swagger UI : coller le token renvoyé par POST /api/auth/login.
    o.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT obtenu via POST /api/auth/login.",
    });
    o.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<MGFL.Api.GlobalExceptionHandler>();

// CORS pour le front React (Vite).
const string CorsPolicy = "frontend";
builder.Services.AddCors(o => o.AddPolicy(CorsPolicy, p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? new[] { "http://localhost:5173" })
    .AllowAnyHeader()
    .AllowAnyMethod()));

// Auth JWT + politiques RBAC (cf. CLAUDE.md §8).
var jwt = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwt["Key"] ?? JwtTokenService.DevFallbackKey);
builder.Services.AddSingleton<JwtTokenService>();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"] ?? "mgfl",
            ValidAudience = jwt["Audience"] ?? "mgfl-clients",
            IssuerSigningKey = new SymmetricSecurityKey(key)
        };
    });

builder.Services.AddAuthorization(options =>
{
    // Chaque policy porte le nom du rôle ; Admin passe partout.
    foreach (var role in Roles.All)
        options.AddPolicy(role, p => p.RequireRole(role, Roles.Admin));

    // Réservations d'emplacements : commerçant OU agent d'organisation (§6.3/§6.4).
    options.AddPolicy("ReservationManager", p =>
        p.RequireRole(Roles.Commercant, Roles.AgentOrganisation, Roles.Admin));

    // Deny by default : tout endpoint sans [AllowAnonymous] exige un utilisateur authentifié.
    options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});

// Licence communautaire QuestPDF (génération des états de base PDF).
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

var app = builder.Build();

// --- Pipeline ---
app.UseExceptionHandler();        // mappe les exceptions vers ProblemDetails (voir GlobalExceptionHandler)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    using var scope = app.Services.CreateScope();
    await DbSeeder.SeedAsync(scope.ServiceProvider.GetRequiredService<MgflDbContext>());
}

app.UseCors(CorsPolicy);

// Photos uploadées, servies sous /uploads/photos. Provider explicite : le dossier est
// créé au démarrage, le provider par défaut resterait un NullFileProvider si wwwroot
// n'existait pas au build de l'hôte (cas d'un checkout propre ou des tests).
var webRoot = Path.Combine(app.Environment.ContentRootPath, "wwwroot");
Directory.CreateDirectory(Path.Combine(webRoot, "uploads", "photos"));
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(webRoot),
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program { }
