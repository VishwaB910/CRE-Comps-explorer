using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace CreComps.Api.Tests;

public class ApiTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly JsonSerializerOptions _json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    public ApiTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _factory.ResetDatabase();
    }

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task List_Paginates()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/comps?page=1&page_size=2");
        response.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(3, doc.RootElement.GetProperty("total").GetInt32());
        Assert.Equal(2, doc.RootElement.GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task Search_ByCity()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/comps?q=Atlanta");
        response.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(2, doc.RootElement.GetProperty("total").GetInt32());
    }

    [Fact]
    public async Task InvalidPriceRange_Returns422()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/comps?min_price=20000000&max_price=10000000");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task GetMissingComp_Returns404()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/comps/999");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task NotesAndTags_Work()
    {
        var client = _factory.CreateClient();
        var noteResp = await client.PostAsJsonAsync(
            "/api/comps/1/notes",
            new { note_text = "  Strong comps set  " },
            _json);
        Assert.Equal(HttpStatusCode.Created, noteResp.StatusCode);

        var tagResp = await client.PostAsJsonAsync(
            "/api/comps/1/tags",
            new { tag = "Follow Up" },
            _json);
        Assert.Equal(HttpStatusCode.Created, tagResp.StatusCode);

        var detail = await client.GetAsync("/api/comps/1");
        using var doc = JsonDocument.Parse(await detail.Content.ReadAsStringAsync());
        Assert.Equal(1, doc.RootElement.GetProperty("notes").GetArrayLength());
        Assert.Equal(1, doc.RootElement.GetProperty("tags").GetArrayLength());
        Assert.Equal("follow up", doc.RootElement.GetProperty("tags")[0].GetProperty("tag").GetString());

        var dup = await client.PostAsJsonAsync("/api/comps/1/tags", new { tag = "follow up" }, _json);
        Assert.Equal(HttpStatusCode.Conflict, dup.StatusCode);
    }

    [Fact]
    public async Task Analytics_ReturnsTrend()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/analytics");
        response.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(doc.RootElement.GetProperty("by_market").GetArrayLength() >= 2);
        Assert.True(doc.RootElement.GetProperty("price_per_sf_trend").GetArrayLength() >= 1);
        Assert.True(doc.RootElement.GetProperty("cap_rate_trend").GetArrayLength() >= 1);
        Assert.True(doc.RootElement.GetProperty("volume_by_month").GetArrayLength() >= 1);
        Assert.True(doc.RootElement.GetProperty("by_market")[0].TryGetProperty("avg_sale_price", out _));
    }

    [Fact]
    public async Task Sort_ByCity()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/comps?sort_by=city&sort_order=asc");
        response.EnsureSuccessStatusCode();
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var cities = doc.RootElement.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("city").GetString())
            .ToList();
        Assert.Equal(cities.OrderBy(c => c).ToList(), cities);
    }

    [Fact]
    public async Task Export_Csv()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/api/comps/export?market=Atlanta");
        response.EnsureSuccessStatusCode();
        Assert.Contains("text/csv", response.Content.Headers.ContentType?.ToString());
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("comp_id,address,city", body);
        Assert.Contains("Atlanta", body);
        Assert.DoesNotContain("Houston", body);
    }
}
