using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace MGFL.Api;

/// <summary>Traduit les exceptions en réponses ProblemDetails (RFC 7807).</summary>
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;
    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) => _logger = logger;

    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        ProblemDetails problem;

        switch (ex)
        {
            case ValidationException ve:
                problem = new ProblemDetails
                {
                    Title = "Données invalides.",
                    Status = StatusCodes.Status400BadRequest,
                    Detail = "Une ou plusieurs règles de validation ont échoué."
                };
                problem.Extensions["errors"] = ve.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
                break;

            default:
                _logger.LogError(ex, "Erreur non gérée");
                problem = new ProblemDetails
                {
                    Title = "Erreur interne du serveur.",
                    Status = StatusCodes.Status500InternalServerError
                };
                break;
        }

        ctx.Response.StatusCode = problem.Status!.Value;
        await ctx.Response.WriteAsJsonAsync(problem, ct);
        return true;
    }
}
