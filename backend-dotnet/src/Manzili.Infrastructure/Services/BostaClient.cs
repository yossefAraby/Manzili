using System.Net.Http.Headers;
using System.Text.Json;
using Manzili.Application.Common;
using Manzili.Application.Configuration;
using Microsoft.Extensions.Options;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Typed HttpClient wrapping the Bosta API. Port of Node services/bosta/client.js:
/// resolves the Authorization header from BostaOptions, retries up to 3 times on
/// 5xx/transport errors with a 1s * attempt backoff, and maps non-2xx to AppException.
/// </summary>
public sealed class BostaClient
{
    private readonly HttpClient _http;
    private readonly BostaOptions _options;

    public BostaClient(HttpClient http, IOptions<AppOptions> options)
    {
        _http = http;
        _options = options.Value.Bosta;
    }

    /// <summary>True when a Bosta authorization header can be resolved AND the integration is enabled.</summary>
    public bool IsConfigured =>
        _options.IntegrationEnabled && !string.IsNullOrWhiteSpace(_options.ResolveAuthorization());

    /// <summary>GET a Bosta endpoint and return the parsed JSON payload (as JsonElement), or null.</summary>
    public Task<JsonElement?> GetAsync(string path, CancellationToken ct = default) =>
        FetchAsync(HttpMethod.Get, path, null, ct);

    /// <summary>POST a JSON body to a Bosta endpoint and return the parsed JSON payload.</summary>
    public Task<JsonElement?> PostAsync(string path, object body, CancellationToken ct = default) =>
        FetchAsync(HttpMethod.Post, path, body, ct);

    /// <summary>Create a delivery (POST /deliveries?apiVersion=1). Returns Bosta's response payload.</summary>
    public Task<JsonElement?> CreateDeliveryAsync(object payload, CancellationToken ct = default) =>
        FetchAsync(HttpMethod.Post, "deliveries?apiVersion=1", payload, ct);

    /// <summary>Fetch a delivery's current state/timeline (GET /deliveries/business/{trackingNumber}).</summary>
    public Task<JsonElement?> GetDeliveryAsync(string trackingNumber, CancellationToken ct = default) =>
        FetchAsync(HttpMethod.Get, $"deliveries/business/{trackingNumber}", null, ct);

    private async Task<JsonElement?> FetchAsync(HttpMethod method, string path, object? body, CancellationToken ct)
    {
        var authorization = _options.ResolveAuthorization();
        if (string.IsNullOrWhiteSpace(authorization))
            throw new AppException("Bosta not configured", 503, "SERVICE_UNAVAILABLE");

        var cleanPath = path.TrimStart('/');
        var uri = new Uri(new Uri(_options.NormalizedBaseUrl), cleanPath);

        Exception? lastError = null;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            try
            {
                using var request = new HttpRequestMessage(method, uri);
                request.Headers.TryAddWithoutValidation("Authorization", authorization);
                if (body is not null)
                {
                    request.Content = new StringContent(
                        JsonSerializer.Serialize(body), System.Text.Encoding.UTF8);
                    request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
                }

                using var response = await _http.SendAsync(request, ct);
                var text = await response.Content.ReadAsStringAsync(ct);
                JsonElement? data = null;
                if (!string.IsNullOrEmpty(text))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(text);
                        data = doc.RootElement.Clone();
                    }
                    catch (JsonException) { data = null; }
                }

                if (!response.IsSuccessStatusCode)
                {
                    var message = TryReadMessage(data) ?? response.ReasonPhrase ?? "error";
                    throw new AppException($"Bosta API error: {message}", (int)response.StatusCode, "BOSTA_ERROR");
                }

                return data;
            }
            catch (AppException err) when (err.StatusCode < 500)
            {
                // 4xx are not retried (matches Node: `err.statusCode < 500` rethrows).
                throw;
            }
            catch (Exception err)
            {
                lastError = err;
                await Task.Delay(1000 * (attempt + 1), ct);
            }
        }

        throw lastError ?? new AppException("Bosta request failed", 502, "BOSTA_ERROR");
    }

    private static string? TryReadMessage(JsonElement? data)
    {
        if (data is { ValueKind: JsonValueKind.Object } el &&
            el.TryGetProperty("message", out var m) && m.ValueKind == JsonValueKind.String)
            return m.GetString();
        return null;
    }
}
