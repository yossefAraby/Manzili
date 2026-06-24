using System.Text;
using FluentValidation;
using Manzili.Api.Common;
using Manzili.Api.Middleware;
using Manzili.Application.Auth;
using Manzili.Application.Configuration;
using Manzili.Infrastructure;
using Manzili.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

// The database was scaffolded database-first and stores most timestamps as
// `timestamp WITHOUT time zone`. Npgsql 6+ rejects writing a DateTime with Kind=Utc to such
// columns — which silently broke every code path that sets `DateTime.UtcNow` (notifications,
// ratings, custom-offer milestones, fulfillment, wallet, returns, Bosta webhooks…). Enabling
// the legacy timestamp behavior makes Npgsql ignore DateTimeKind on write (and return
// Unspecified on read), matching how the app uses UtcNow throughout. Must run before the first
// Npgsql operation.
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// ---- Options ----
builder.Services.AddOptions<AppOptions>()
    .Bind(builder.Configuration.GetSection(AppOptions.SectionName))
    .ValidateOnStart();
var appOptions = builder.Configuration.GetSection(AppOptions.SectionName).Get<AppOptions>() ?? new AppOptions();

// ---- MVC / OpenAPI ----
builder.Services.AddControllers();
// Lets the checkout services read the request Origin so payment redirect URLs return to
// the site the checkout was triggered from (localhost vs Vercel), not a fixed config value.
builder.Services.AddHttpContextAccessor();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ---- Infrastructure (EF Core, security, services) ----
builder.Services.AddInfrastructure(builder.Configuration);

// ---- Validation ----
builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();

// ---- CORS (mirrors Node: configurable origins + credentials) ----
const string CorsPolicy = "ManziliCors";
builder.Services.AddCors(options => options.AddPolicy(CorsPolicy, policy =>
{
    var origins = (appOptions.CorsOrigin ?? "*")
        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
    if (origins.Length == 0 || origins.Contains("*"))
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    else
        policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().AllowCredentials();
}));

// ---- Authentication (JWT bearer, same HS256 secret + claims as Node) ----
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false; // keep raw "sub"/"role"/"sellerId" claim names
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(appOptions.Jwt.Secret)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(5),
            NameClaimType = "sub",
            RoleClaimType = "role",
        };
        // Emit the Node-compatible error envelope on 401/403 instead of an empty body.
        options.Events = new JwtBearerEvents
        {
            // Auth is cookie-based (httpOnly): pull the access JWT from the cookie when there's no
            // Authorization header. Admin and normal sessions use SEPARATE cookies — on /api/v1/admin/*
            // routes we read the admin cookie, everywhere else the normal one. This keeps the two
            // sessions fully isolated: a seller's cookie can't authenticate an admin route, and an
            // admin login never touches the buyer/seller session.
            OnMessageReceived = ctx =>
            {
                if (string.IsNullOrEmpty(ctx.Token))
                {
                    var path = ctx.Request.Path.Value ?? string.Empty;
                    var isAdmin = path.StartsWith(AuthCookies.AdminPath, StringComparison.OrdinalIgnoreCase);
                    var cookieName = isAdmin ? AuthCookies.AdminAccessCookie : AuthCookies.AccessCookie;
                    if (ctx.Request.Cookies.TryGetValue(cookieName, out var cookie) && !string.IsNullOrEmpty(cookie))
                        ctx.Token = cookie;
                }
                return Task.CompletedTask;
            },
            OnChallenge = async ctx =>
            {
                ctx.HandleResponse();
                await WriteEnvelopeError(ctx.Response, 401, "Unauthorized", "UNAUTHORIZED");
            },
            OnForbidden = async ctx =>
                await WriteEnvelopeError(ctx.Response, 403, "Forbidden: insufficient role", "FORBIDDEN"),
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

// ---- Pipeline ----
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(CorsPolicy);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Ensure additive schema columns exist (idempotent ADD COLUMN IF NOT EXISTS), then the demo admin
// accounts. Wrapped so a transient DB issue at boot never blocks the API from starting.
try
{
    await Manzili.Infrastructure.SchemaMigrator.EnsureAsync(app.Services);
    await Manzili.Infrastructure.AdminSeeder.SeedAsync(app.Services);
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Schema/admin seeding was skipped");
}

// Liveness + DB connectivity check (parity with Node /api/v1/health, plus a DB round-trip)
app.MapGet("/api/v1/health", async (ManziliDbContext db) =>
{
    var canConnect = await db.Database.CanConnectAsync();
    return Results.Ok(new { success = true, data = new { status = "ok", database = canConnect ? "connected" : "unreachable" } });
});

app.Run();

static async Task WriteEnvelopeError(HttpResponse response, int status, string message, string code)
{
    if (response.HasStarted) return;
    response.StatusCode = status;
    response.ContentType = "application/json";
    await response.WriteAsync($"{{\"success\":false,\"error\":{{\"message\":\"{message}\",\"code\":\"{code}\"}}}}");
}

public partial class Program { } // exposed for WebApplicationFactory integration tests
