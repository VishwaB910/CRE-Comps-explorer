using Microsoft.AspNetCore.Mvc;

namespace CreComps.Api.Dtos;

public record CompDto(
    int CompId,
    string Address,
    string City,
    string State,
    string Zip,
    string Market,
    string PropertyType,
    int SquareFootage,
    int? YearBuilt,
    long SalePrice,
    decimal PricePerSf,
    decimal CapRate,
    DateOnly SaleDate,
    string Buyer,
    string Seller
);

public record NoteDto(long Id, int CompId, string NoteText, DateTimeOffset CreatedAt);

public record TagDto(long Id, int CompId, string Tag, DateTimeOffset CreatedAt);

public record CompInsightsDto(
    decimal MarketAvgPricePerSf,
    decimal TypeAvgCapRate,
    decimal PricePerSfVsMarketPct,
    decimal CapRateVsTypePct
);

public record CompDetailDto(
    int CompId,
    string Address,
    string City,
    string State,
    string Zip,
    string Market,
    string PropertyType,
    int SquareFootage,
    int? YearBuilt,
    long SalePrice,
    decimal PricePerSf,
    decimal CapRate,
    DateOnly SaleDate,
    string Buyer,
    string Seller,
    IReadOnlyList<NoteDto> Notes,
    IReadOnlyList<TagDto> Tags,
    CompInsightsDto? Insights
);

public record CompListResponse(
    IReadOnlyList<CompDto> Items,
    int Total,
    int Page,
    int PageSize,
    int TotalPages
);

public record CompareResponse(IReadOnlyList<CompDto> Items);

public record SavedSearchDto(long Id, string Name, Dictionary<string, object?> Filters, DateTimeOffset CreatedAt);

public record SavedSearchCreateRequest(string Name, Dictionary<string, object?>? Filters);

public record NoteCreateRequest(string NoteText);

public record TagCreateRequest(string Tag);

public record FilterMetaDto(
    IReadOnlyList<string> Markets,
    IReadOnlyList<string> PropertyTypes,
    IReadOnlyList<string> Tags
);

public record MarketAggregateDto(
    string Market,
    decimal AvgPricePerSf,
    decimal AvgCapRate,
    decimal AvgSalePrice,
    int CompCount
);

public record PropertyTypeAggregateDto(
    string PropertyType,
    decimal AvgPricePerSf,
    decimal AvgCapRate,
    decimal AvgSalePrice,
    int CompCount
);

public record PricePerSfTrendPointDto(string SaleMonth, decimal AvgPricePerSf, int CompCount);

public record CapRateTrendPointDto(string SaleMonth, decimal AvgCapRate, int CompCount);

public record VolumeByMonthPointDto(string SaleMonth, int DealCount, long TotalSalePrice);

public record AnalyticsResponse(
    IReadOnlyList<MarketAggregateDto> ByMarket,
    IReadOnlyList<PropertyTypeAggregateDto> ByPropertyType,
    IReadOnlyList<PricePerSfTrendPointDto> PricePerSfTrend,
    IReadOnlyList<CapRateTrendPointDto> CapRateTrend,
    IReadOnlyList<VolumeByMonthPointDto> VolumeByMonth
);

public class CompQuery
{
    [FromQuery(Name = "q")]
    public string? Q { get; set; }

    [FromQuery(Name = "property_type")]
    public string? PropertyType { get; set; }

    [FromQuery(Name = "market")]
    public string? Market { get; set; }

    [FromQuery(Name = "tag")]
    public string? Tag { get; set; }

    [FromQuery(Name = "min_price")]
    public long? MinPrice { get; set; }

    [FromQuery(Name = "max_price")]
    public long? MaxPrice { get; set; }

    [FromQuery(Name = "min_cap_rate")]
    public decimal? MinCapRate { get; set; }

    [FromQuery(Name = "max_cap_rate")]
    public decimal? MaxCapRate { get; set; }

    [FromQuery(Name = "sale_date_from")]
    public string? SaleDateFrom { get; set; }

    [FromQuery(Name = "sale_date_to")]
    public string? SaleDateTo { get; set; }

    [FromQuery(Name = "sort_by")]
    public string SortBy { get; set; } = "sale_date";

    [FromQuery(Name = "sort_order")]
    public string SortOrder { get; set; } = "desc";

    [FromQuery(Name = "page")]
    public int Page { get; set; } = 1;

    [FromQuery(Name = "page_size")]
    public int PageSize { get; set; } = 10;
}
