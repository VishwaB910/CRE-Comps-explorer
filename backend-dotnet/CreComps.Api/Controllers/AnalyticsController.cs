using CreComps.Api.Data;
using CreComps.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CreComps.Api.Controllers;

[ApiController]
[Route("api/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AnalyticsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<AnalyticsResponse>> Get(CancellationToken ct)
    {
        var comps = await _db.Comps.AsNoTracking()
            .Select(c => new
            {
                c.Market,
                c.PropertyType,
                c.SaleDate,
                c.PricePerSf,
                c.CapRate,
                c.SalePrice,
            })
            .ToListAsync(ct);

        var byMarket = comps
            .GroupBy(c => c.Market)
            .Select(g => new MarketAggregateDto(
                g.Key,
                Math.Round(g.Average(c => c.PricePerSf), 2),
                Math.Round(g.Average(c => c.CapRate), 2),
                (decimal)Math.Round(g.Average(c => (double)c.SalePrice), 2),
                g.Count()))
            .OrderBy(x => x.Market)
            .ToList();

        var byType = comps
            .GroupBy(c => c.PropertyType)
            .Select(g => new PropertyTypeAggregateDto(
                g.Key,
                Math.Round(g.Average(c => c.PricePerSf), 2),
                Math.Round(g.Average(c => c.CapRate), 2),
                (decimal)Math.Round(g.Average(c => (double)c.SalePrice), 2),
                g.Count()))
            .OrderBy(x => x.PropertyType)
            .ToList();

        var byMonth = comps
            .GroupBy(c => c.SaleDate.ToString("yyyy-MM"))
            .OrderBy(g => g.Key)
            .ToList();

        var priceTrend = byMonth
            .Select(g => new PricePerSfTrendPointDto(
                g.Key,
                Math.Round(g.Average(x => x.PricePerSf), 2),
                g.Count()))
            .ToList();

        var capTrend = byMonth
            .Select(g => new CapRateTrendPointDto(
                g.Key,
                Math.Round(g.Average(x => x.CapRate), 2),
                g.Count()))
            .ToList();

        var volume = byMonth
            .Select(g => new VolumeByMonthPointDto(
                g.Key,
                g.Count(),
                g.Sum(x => x.SalePrice)))
            .ToList();

        return Ok(new AnalyticsResponse(byMarket, byType, priceTrend, capTrend, volume));
    }
}
