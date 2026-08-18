using System.Text.Json;
using CreComps.Api.Data;
using CreComps.Api.Dtos;
using CreComps.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CreComps.Api.Controllers;

[ApiController]
[Route("api/saved-searches")]
public class SavedSearchesController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    private readonly AppDbContext _db;

    public SavedSearchesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SavedSearchDto>>> List(CancellationToken ct)
    {
        var rows = await _db.SavedSearches.AsNoTracking()
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(ct);
        return Ok(rows.Select(ToDto));
    }

    [HttpPost]
    public async Task<ActionResult<SavedSearchDto>> Create(
        [FromBody] SavedSearchCreateRequest request, CancellationToken ct)
    {
        var name = request.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(name))
        {
            return UnprocessableEntity(new { detail = "name cannot be empty" });
        }

        if (name.Length > 120)
        {
            return UnprocessableEntity(new { detail = "name must be at most 120 characters" });
        }

        var filters = request.Filters ?? new Dictionary<string, object?>();
        var row = new SavedSearch
        {
            Name = name,
            FiltersJson = JsonSerializer.Serialize(filters, JsonOpts),
            CreatedAt = DateTimeOffset.UtcNow,
        };
        _db.SavedSearches.Add(row);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(List), ToDto(row));
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        var row = await _db.SavedSearches.FirstOrDefaultAsync(s => s.Id == id, ct);
        if (row is null)
        {
            return NotFound(new { detail = $"Saved search {id} not found" });
        }

        _db.SavedSearches.Remove(row);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static SavedSearchDto ToDto(SavedSearch row)
    {
        Dictionary<string, object?> filters;
        try
        {
            filters = JsonSerializer.Deserialize<Dictionary<string, object?>>(row.FiltersJson, JsonOpts)
                      ?? new Dictionary<string, object?>();
        }
        catch
        {
            filters = new Dictionary<string, object?>();
        }

        return new SavedSearchDto(row.Id, row.Name, filters, row.CreatedAt);
    }
}
