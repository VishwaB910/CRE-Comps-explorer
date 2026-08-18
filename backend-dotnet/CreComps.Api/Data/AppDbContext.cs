using CreComps.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CreComps.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Comp> Comps => Set<Comp>();
    public DbSet<CompNote> CompNotes => Set<CompNote>();
    public DbSet<CompTag> CompTags => Set<CompTag>();
    public DbSet<SavedSearch> SavedSearches => Set<SavedSearch>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<CompTag>()
            .HasIndex(t => new { t.CompId, t.Tag })
            .IsUnique();

        modelBuilder.Entity<CompNote>()
            .HasOne(n => n.Comp)
            .WithMany(c => c.Notes)
            .HasForeignKey(n => n.CompId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CompTag>()
            .HasOne(t => t.Comp)
            .WithMany(c => c.Tags)
            .HasForeignKey(t => t.CompId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
