using System.Globalization;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Manzili.Application.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Manzili.Infrastructure.Services;

/// <summary>
/// Turns text into embedding vectors for semantic search. Jina (jina-embeddings-v5-text-small)
/// is the primary provider; Cohere (embed-v4.0) is the standby. Both output 1024-dim multilingual
/// vectors. The two are NOT interchangeable per-call (different vector spaces), so the index is
/// single-provider — Cohere only takes over if Jina is unavailable for a whole (re)build.
/// Returns null when no provider is configured/reachable, so callers fall back to lexical search.
/// </summary>
public sealed class EmbeddingService
{
    private readonly HttpClient _http;
    private readonly EmbeddingsOptions _opts;
    private readonly ILogger<EmbeddingService> _log;

    public EmbeddingService(HttpClient http, IOptions<AppOptions> options, ILogger<EmbeddingService> log)
    {
        _http = http;
        _opts = options.Value.Embeddings;
        _log = log;
    }

    public bool IsConfigured => _opts.IsConfigured;
    public int Dimensions => _opts.Dimensions;

    /// <summary>Embed texts. <paramref name="isQuery"/> selects the retrieval.query vs retrieval.passage
    /// task (queries and documents are embedded asymmetrically). Jina → Cohere fallback; null on total failure.</summary>
    public async Task<IReadOnlyList<float[]>?> EmbedAsync(IReadOnlyList<string> texts, bool isQuery, CancellationToken ct = default)
    {
        if (!_opts.Enabled || texts is null || texts.Count == 0) return null;
        if (!string.IsNullOrWhiteSpace(_opts.JinaApiKey))
        {
            try { return await EmbedJinaAsync(texts, isQuery, ct); }
            catch (Exception e) { _log.LogWarning(e, "[embeddings] Jina failed, trying Cohere"); }
        }
        if (!string.IsNullOrWhiteSpace(_opts.CohereApiKey))
        {
            try { return await EmbedCohereAsync(texts, isQuery, ct); }
            catch (Exception e) { _log.LogWarning(e, "[embeddings] Cohere failed"); }
        }
        return null;
    }

    public async Task<float[]?> EmbedOneAsync(string text, bool isQuery, CancellationToken ct = default)
    {
        var r = await EmbedAsync(new[] { text }, isQuery, ct);
        return r is { Count: > 0 } ? r[0] : null;
    }

    private async Task<IReadOnlyList<float[]>> EmbedJinaAsync(IReadOnlyList<string> texts, bool isQuery, CancellationToken ct)
    {
        var body = new
        {
            model = _opts.JinaModel,
            task = isQuery ? "retrieval.query" : "retrieval.passage",
            dimensions = _opts.Dimensions,
            input = texts,
        };
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.jina.ai/v1/embeddings")
        {
            Content = JsonContent.Create(body),
        };
        req.Headers.TryAddWithoutValidation("Authorization", $"Bearer {_opts.JinaApiKey}");
        using var res = await _http.SendAsync(req, ct);
        res.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
        var data = doc.RootElement.GetProperty("data");
        var list = new List<float[]>(data.GetArrayLength());
        foreach (var item in data.EnumerateArray())
            list.Add(ReadVector(item.GetProperty("embedding")));
        return list;
    }

    private async Task<IReadOnlyList<float[]>> EmbedCohereAsync(IReadOnlyList<string> texts, bool isQuery, CancellationToken ct)
    {
        var body = new
        {
            model = _opts.CohereModel,
            input_type = isQuery ? "search_query" : "search_document",
            embedding_types = new[] { "float" },
            output_dimension = _opts.Dimensions,
            texts,
        };
        using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.cohere.com/v2/embed")
        {
            Content = JsonContent.Create(body),
        };
        req.Headers.TryAddWithoutValidation("Authorization", $"Bearer {_opts.CohereApiKey}");
        using var res = await _http.SendAsync(req, ct);
        res.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
        var floats = doc.RootElement.GetProperty("embeddings").GetProperty("float");
        var list = new List<float[]>(floats.GetArrayLength());
        foreach (var item in floats.EnumerateArray())
            list.Add(ReadVector(item));
        return list;
    }

    private static float[] ReadVector(JsonElement arr)
    {
        var vec = new float[arr.GetArrayLength()];
        var i = 0;
        foreach (var n in arr.EnumerateArray()) vec[i++] = n.GetSingle();
        return vec;
    }

    /// <summary>Format a vector as a pgvector text literal "[0.1,0.2,...]" for a {param}::vector cast.</summary>
    public static string ToPgVector(float[] vec)
    {
        var sb = new StringBuilder(vec.Length * 9);
        sb.Append('[');
        for (var i = 0; i < vec.Length; i++)
        {
            if (i > 0) sb.Append(',');
            sb.Append(vec[i].ToString("R", CultureInfo.InvariantCulture));
        }
        sb.Append(']');
        return sb.ToString();
    }
}
