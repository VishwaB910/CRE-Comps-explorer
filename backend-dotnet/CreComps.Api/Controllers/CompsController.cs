using System.Globalization;
using System.Text;
using CreComps.Api.Data;
using CreComps.Api.Dtos;
using CreComps.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CreComps.Api.Controllers;

[ApiController]
[Route("api/comps")]
public class CompsController : ControllerBase
{
    private readonly AppDbContext _db;

    public CompsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("meta/filters")]
    public async Task<ActionResult<FilterMetaDto>> GetFilterMeta(CancellationToken ct)
    {
        var markets = await _db.Comps.Select(c => c.Market).Distinct().OrderBy(m => m).ToListAsync(ct);
        var propertyTypes = await _db.Comps.Select(c => c.PropertyType).Distinct().OrderBy(p => p).ToListAsync(ct);
        var tags = await _db.CompTags.Select(t => t.Tag).Distinct().OrderBy(t => t).ToListAsync(ct);
        return Ok(new FilterMetaDto(markets, propertyTypes, tags));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] CompQuery query, CancellationToken ct)
    {
        var error = CompQueryService.Validate(query, requirePagination: false);
        if (error is not null)
        {
            return error;
        }

        var source = CompQueryService.ApplySort(
            CompQueryService.ApplyFilters(_db.Comps.AsNoTracking(), query),
            query);

        var items = await source.ToListAsync(ct);
        var sb = new StringBuilder();
        sb.AppendLine("comp_id,address,city,state,zip,market,property_type,square_footage,year_built,sale_price,price_per_sf,cap_rate,sale_date,buyer,seller");
        foreach (var item in items)
        {
            sb.Append(item.CompId).Append(',')
                .Append(Csv(item.Address)).Append(',')
                .Append(Csv(item.City)).Append(',')
                .Append(Csv(item.State)).Append(',')
                .Append(Csv(item.Zip)).Append(',')
                .Append(Csv(item.Market)).Append(',')
                .Append(Csv(item.PropertyType)).Append(',')
                .Append(item.SquareFootage).Append(',')
                .Append(item.YearBuilt?.ToString(CultureInfo.InvariantCulture) ?? "").Append(',')
                .Append(item.SalePrice).Append(',')
                .Append(item.PricePerSf.ToString(CultureInfo.InvariantCulture)).Append(',')
                .Append(item.CapRate.ToString(CultureInfo.InvariantCulture)).Append(',')
                .Append(item.SaleDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)).Append(',')
                .Append(Csv(item.Buyer)).Append(',')
                .Append(Csv(item.Seller))
                .AppendLine();
        }

        var bytes = Encoding.UTF8.GetBytes(sb.ToString());
        return File(bytes, "text/csv", "filtered_comps.csv");
    }

    [HttpGet("compare")]
    public async Task<ActionResult<CompareResponse>> Compare([FromQuery] string? ids, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(ids))
        {
            return UnprocessableEntity(new { detail = "ids must be comma-separated integers" });
        }

        List<int> idList;
        try
        {
            idList = ids.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(int.Parse)
                .ToList();
        }
        catch
        {
            return UnprocessableEntity(new { detail = "ids must be comma-separated integers" });
        }

        if (idList.Count is < 2 or > 4)
        {
            return UnprocessableEntity(new { detail = "Select between 2 and 4 comps to compare" });
        }

        var comps = await _db.Comps.AsNoTracking()
            .Where(c => idList.Contains(c.CompId))
            .ToListAsync(ct);
        var byId = comps.ToDictionary(c => c.CompId);
        var missing = idList.Where(id => !byId.ContainsKey(id)).ToList();
        if (missing.Count > 0)
        {
            return NotFound(new { detail = $"Comps not found: [{string.Join(", ", missing)}]" });
        }

        return Ok(new CompareResponse(idList.Select(id => CompQueryService.ToDto(byId[id])).ToList()));
    }

    [HttpGet]
    public async Task<ActionResult<CompListResponse>> List([FromQuery] CompQuery query, CancellationToken ct)
    {
        var error = CompQueryService.Validate(query);
        if (error is not null)
        {
            return error;
        }

        var filtered = CompQueryService.ApplyFilters(_db.Comps.AsNoTracking(), query);
        var total = await filtered.CountAsync(ct);
        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)query.PageSize);
        var items = await CompQueryService.ApplySort(filtered, query)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return Ok(new CompListResponse(
            items.Select(CompQueryService.ToDto).ToList(),
            total,
            query.Page,
            query.PageSize,
            totalPages));
    }

    [HttpGet("{compId:int}")]
    public async Task<ActionResult<CompDetailDto>> Get(int compId, CancellationToken ct)
    {
        var comp = await _db.Comps
            .AsNoTracking()
            .Include(c => c.Notes)
            .Include(c => c.Tags)
            .FirstOrDefaultAsync(c => c.CompId == compId, ct);

        if (comp is null)
        {
            return NotFound(new { detail = $"Comp {compId} not found" });
        }

        var marketAvg = await _db.Comps.AsNoTracking()
            .Where(c => c.Market == comp.Market)
            .AverageAsync(c => c.PricePerSf, ct);
        var typeAvgCap = await _db.Comps.AsNoTracking()
            .Where(c => c.PropertyType == comp.PropertyType)
            .AverageAsync(c => c.CapRate, ct);

        static decimal Pct(decimal value, decimal baseline) =>
            baseline == 0 ? 0 : Math.Round((value - baseline) / baseline * 100, 1);

        var insights = new CompInsightsDto(
            Math.Round(marketAvg, 2),
            Math.Round(typeAvgCap, 2),
            Pct(comp.PricePerSf, Math.Round(marketAvg, 2)),
            Pct(comp.CapRate, Math.Round(typeAvgCap, 2)));

        return Ok(CompQueryService.ToDetailDto(comp, insights));
    }

    private static string Csv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }
}
