using CreComps.Api.Data;
using CreComps.Api.Dtos;
using CreComps.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CreComps.Api.Controllers;

[ApiController]
[Route("api/comps/{compId:int}/notes")]
public class NotesController : ControllerBase
{
    private readonly AppDbContext _db;

    public NotesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<NoteDto>>> List(int compId, CancellationToken ct)
    {
        if (!await _db.Comps.AnyAsync(c => c.CompId == compId, ct))
        {
            return NotFound(new { detail = $"Comp {compId} not found" });
        }

        var notes = await _db.CompNotes
            .AsNoTracking()
            .Where(n => n.CompId == compId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new NoteDto(n.Id, n.CompId, n.NoteText, n.CreatedAt))
            .ToListAsync(ct);

        return Ok(notes);
    }

    [HttpPost]
    public async Task<ActionResult<NoteDto>> Create(int compId, [FromBody] NoteCreateRequest request, CancellationToken ct)
    {
        if (!await _db.Comps.AnyAsync(c => c.CompId == compId, ct))
        {
            return NotFound(new { detail = $"Comp {compId} not found" });
        }

        var text = request.NoteText?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(text))
        {
            return UnprocessableEntity(new { detail = "note_text cannot be empty" });
        }

        var note = new CompNote
        {
            CompId = compId,
            NoteText = text,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        _db.CompNotes.Add(note);
        await _db.SaveChangesAsync(ct);

        var dto = new NoteDto(note.Id, note.CompId, note.NoteText, note.CreatedAt);
        return CreatedAtAction(nameof(List), new { compId }, dto);
    }

    [HttpDelete("{noteId:long}")]
    public async Task<IActionResult> Delete(int compId, long noteId, CancellationToken ct)
    {
        if (!await _db.Comps.AnyAsync(c => c.CompId == compId, ct))
        {
            return NotFound(new { detail = $"Comp {compId} not found" });
        }

        var note = await _db.CompNotes.FirstOrDefaultAsync(n => n.Id == noteId && n.CompId == compId, ct);
        if (note is null)
        {
            return NotFound(new { detail = $"Note {noteId} not found" });
        }

        _db.CompNotes.Remove(note);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}
