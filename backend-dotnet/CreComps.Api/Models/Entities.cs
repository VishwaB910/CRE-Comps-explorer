using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace CreComps.Api.Models;

[Table("comps")]
public class Comp
{
    [Key]
    [Column("comp_id")]
    public int CompId { get; set; }

    [Column("address")]
    public string Address { get; set; } = string.Empty;

    [Column("city")]
    public string City { get; set; } = string.Empty;

    [Column("state")]
    public string State { get; set; } = string.Empty;

    [Column("zip")]
    public string Zip { get; set; } = string.Empty;

    [Column("market")]
    public string Market { get; set; } = string.Empty;

    [Column("property_type")]
    public string PropertyType { get; set; } = string.Empty;

    [Column("square_footage")]
    public int SquareFootage { get; set; }

    [Column("year_built")]
    public int? YearBuilt { get; set; }

    [Column("sale_price")]
    public long SalePrice { get; set; }

    [Column("price_per_sf")]
    public decimal PricePerSf { get; set; }

    [Column("cap_rate")]
    public decimal CapRate { get; set; }

    [Column("sale_date")]
    public DateOnly SaleDate { get; set; }

    [Column("buyer")]
    public string Buyer { get; set; } = string.Empty;

    [Column("seller")]
    public string Seller { get; set; } = string.Empty;

    public ICollection<CompNote> Notes { get; set; } = new List<CompNote>();
    public ICollection<CompTag> Tags { get; set; } = new List<CompTag>();
}

[Table("comp_notes")]
public class CompNote
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("comp_id")]
    public int CompId { get; set; }

    [Column("note_text")]
    public string NoteText { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    public Comp? Comp { get; set; }
}

[Table("comp_tags")]
public class CompTag
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("comp_id")]
    public int CompId { get; set; }

    [Column("tag")]
    public string Tag { get; set; } = string.Empty;

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }

    public Comp? Comp { get; set; }
}

[Table("saved_searches")]
public class SavedSearch
{
    [Key]
    [Column("id")]
    public long Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("filters", TypeName = "jsonb")]
    public string FiltersJson { get; set; } = "{}";

    [Column("created_at")]
    public DateTimeOffset CreatedAt { get; set; }
}
