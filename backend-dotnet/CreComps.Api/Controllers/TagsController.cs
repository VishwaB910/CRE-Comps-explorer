using CreComps.Api.Data;
using CreComps.Api.Dtos;
using CreComps.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CreComps.Api.Controllers;

[ApiController]
[Route("api/comps/{compId:int}/tags")]
public class TagsController : ControllerBase
{
    private readonly AppDbContext _db;

    public TagsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TagDto>>> List(int compId, CancellationToken ct)
    {
        if (!await _db.Comps.AnyAsync(c => c.CompId == compId, ct))
        {
            return NotFound(new { detail = $"Comp {compId} not found" });
        }

        var tags = await _db.CompTags
            .AsNoTracking()
            .Where(t => t.CompId == compId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new TagDto(t.Id, t.CompId, t.Tag, t.CreatedAt))
            .ToListAsync(ct);

        return Ok(tags);
    }

    [HttpPost]
    public async Task<ActionResult<TagDto>> Create(int compId, [FromBody] TagCreateRequest request, CancellationToken ct)
    {
        if (!await _db.Comps.AnyAsync(c => c.CompId == compId, ct))
        {
            return NotFound(new { detail = $"Comp {compId} not found" });
        }

        var tagValue = request.Tag?.Trim().ToLowerInvariant() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(tagValue))
        {
            return UnprocessableEntity(new { detail = "tag cannot be empty" });
        }

        var exists = await _db.CompTags.AnyAsync(t => t.CompId == compId && t.Tag == tagValue, ct);
        if (exists)
        {
            return Conflict(new { detail = $"Tag '{tagValue}' already exists on this comp" });
        }

        var tag = new CompTag
        {
            CompId = compId,
            Tag = tagValue,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        _db.CompTags.Add(tag);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return Conflict(new { detail = $"Tag '{tagValue}' already exists on this comp" });
        }

        var dto = new TagDto(tag.Id, tag.CompId, tag.Tag, tag.CreatedAt);
        return CreatedAtAction(nameof(List), new { compId }, dto);
    }

    [HttpDelete("{tagId:long}")]
    public async Task<IActionResult> Delete(int compId, long tagId, CancellationToken ct)
    {
        if (!await _db.Comps.AnyAsync(c => c.CompId == compId, ct))
        {
            return NotFound(new { detail = $"Comp {compId} not found" });
        }

        var tag = await _db.CompTags.FirstOrDefaultAsync(t => t.Id == tagId && t.CompId == compId, ct);
        if (tag is null)
        {
            return NotFound(new { detail = $"Tag {tagId} not found" });
        }

        _db.CompTags.Remove(tag);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
