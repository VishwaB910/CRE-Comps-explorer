using CreComps.Api.Dtos;
using CreComps.Api.Models;
using Microsoft.AspNetCore.Mvc;

namespace CreComps.Api.Services;

public static class CompQueryService
{
    private static readonly HashSet<string> AllowedPropertyTypes = new(StringComparer.Ordinal)
    {
        "Office", "Retail", "Industrial", "Multifamily"
    };

    private static readonly HashSet<string> AllowedSortFields = new(StringComparer.Ordinal)
    {
        "address", "city", "state", "market", "property_type", "square_footage",
        "sale_price", "price_per_sf", "cap_rate", "sale_date", "buyer", "seller"
    };

    public static ActionResult? Validate(CompQuery query, bool requirePagination = true)
    {
        if (requirePagination)
        {
            if (query.Page < 1)
            {
                return new UnprocessableEntityObjectResult(new { detail = "page must be >= 1" });
            }

            if (query.PageSize < 1 || query.PageSize > 100)
            {
                return new UnprocessableEntityObjectResult(new { detail = "page_size must be between 1 and 100" });
            }
        }

        if (!string.IsNullOrWhiteSpace(query.PropertyType) && !AllowedPropertyTypes.Contains(query.PropertyType))
        {
            return new UnprocessableEntityObjectResult(new { detail = "Invalid property_type" });
        }

        if (!AllowedSortFields.Contains(query.SortBy))
        {
            return new UnprocessableEntityObjectResult(new { detail = "Invalid sort_by" });
        }

        if (query.SortOrder is not ("asc" or "desc"))
        {
            return new UnprocessableEntityObjectResult(new { detail = "Invalid sort_order" });
        }

        if (query.MinPrice is not null && query.MaxPrice is not null && query.MinPrice > query.MaxPrice)
        {
            return new UnprocessableEntityObjectResult(new { detail = "min_price cannot be greater than max_price" });
        }

        if (query.MinCapRate is not null && query.MaxCapRate is not null && query.MinCapRate > query.MaxCapRate)
        {
            return new UnprocessableEntityObjectResult(new { detail = "min_cap_rate cannot be greater than max_cap_rate" });
        }

        if (!string.IsNullOrWhiteSpace(query.SaleDateFrom) && !DateOnly.TryParse(query.SaleDateFrom, out _))
        {
            return new UnprocessableEntityObjectResult(new { detail = "sale_date_from must be YYYY-MM-DD" });
        }

        if (!string.IsNullOrWhiteSpace(query.SaleDateTo) && !DateOnly.TryParse(query.SaleDateTo, out _))
        {
            return new UnprocessableEntityObjectResult(new { detail = "sale_date_to must be YYYY-MM-DD" });
        }

        if (!string.IsNullOrWhiteSpace(query.SaleDateFrom) && !string.IsNullOrWhiteSpace(query.SaleDateTo)
            && string.CompareOrdinal(query.SaleDateFrom, query.SaleDateTo) > 0)
        {
            return new UnprocessableEntityObjectResult(new { detail = "sale_date_from cannot be after sale_date_to" });
        }

        return null;
    }

    public static IQueryable<Comp> ApplyFilters(IQueryable<Comp> source, CompQuery query)
    {
        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var term = query.Q.Trim().ToLowerInvariant();
            source = source.Where(c =>
                c.Address.ToLower().Contains(term) || c.City.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(query.PropertyType))
        {
            source = source.Where(c => c.PropertyType == query.PropertyType);
        }

        if (!string.IsNullOrWhiteSpace(query.Market))
        {
            source = source.Where(c => c.Market == query.Market);
        }

        if (!string.IsNullOrWhiteSpace(query.Tag))
        {
            var tag = query.Tag.Trim().ToLowerInvariant();
            source = source.Where(c => c.Tags.Any(t => t.Tag == tag));
        }

        if (query.MinPrice is not null)
        {
            source = source.Where(c => c.SalePrice >= query.MinPrice);
        }

        if (query.MaxPrice is not null)
        {
            source = source.Where(c => c.SalePrice <= query.MaxPrice);
        }

        if (query.MinCapRate is not null)
        {
            source = source.Where(c => c.CapRate >= query.MinCapRate);
        }

        if (query.MaxCapRate is not null)
        {
            source = source.Where(c => c.CapRate <= query.MaxCapRate);
        }

        if (!string.IsNullOrWhiteSpace(query.SaleDateFrom) && DateOnly.TryParse(query.SaleDateFrom, out var from))
        {
            source = source.Where(c => c.SaleDate >= from);
        }

        if (!string.IsNullOrWhiteSpace(query.SaleDateTo) && DateOnly.TryParse(query.SaleDateTo, out var to))
        {
            source = source.Where(c => c.SaleDate <= to);
        }

        return source;
    }

    public static IQueryable<Comp> ApplySort(IQueryable<Comp> source, CompQuery query)
    {
        var asc = query.SortOrder == "asc";
        return query.SortBy switch
        {
            "address" => asc
                ? source.OrderBy(c => c.Address).ThenBy(c => c.CompId)
                : source.OrderByDescending(c => c.Address).ThenBy(c => c.CompId),
            "city" => asc
                ? source.OrderBy(c => c.City).ThenBy(c => c.CompId)
                : source.OrderByDescending(c => c.City).ThenBy(c => c.CompId),
            "state" => asc
                ? source.OrderBy(c => c.State).ThenBy(c => c.CompId)
                : source.OrderByDescending(c => c.State).ThenBy(c => c.CompId),
            "market" => asc
                ? source.OrderBy(c => c.Market).ThenBy(c => c.CompId)
                : source.OrderByDescending(c => c.Market).ThenBy(c => c.CompId),
            "property_type" => asc
                ? source.OrderBy(c => c.PropertyType).ThenBy(c => c.CompId)
                : source.OrderByDescending(c => c.PropertyType).ThenBy(c => c.CompId),
            "square_footage" => asc
                ? source.OrderBy(c => c.SquareFootage).ThenBy(c => c.CompId)
                : source.OrderByDescending(c => c.SquareFootage).ThenBy(c => c.CompId),
            "sale_price" => asc
                ? source.OrderBy(c => c.SalePrice).ThenBy(c => c.CompId)
                : source.OrderByDescending(c => c.SalePrice).ThenBy(c => c.CompId),
            "price_per_sf" => asc
                ? source.OrderBy(c => c.PricePerSf).ThenBy(c => c.CompId)
                : source.OrderByDescending(c => c.PricePerSf).ThenBy(c => c.CompId),
            "cap_rate" => asc
                ? source.OrderBy(c => c.CapRate).ThenBy(c => c.CompId)
                : source.OrderByDescending(c => c.CapRate).ThenBy(c => c.CompId),
            "buyer" => asc
                ? source.OrderBy(c => c.Buyer).ThenBy(c => c.CompId)
                : source.OrderByDescending(c => c.Buyer).ThenBy(c => c.CompId),
            "seller" => asc
                ? source.OrderBy(c => c.Seller).ThenBy(c => c.CompId)
                : source.OrderByDescending(c => c.Seller).ThenBy(c => c.CompId),
            _ => asc
                ? source.OrderBy(c => c.SaleDate).ThenBy(c => c.CompId)
                : source.OrderByDescending(c => c.SaleDate).ThenBy(c => c.CompId),
        };
    }

    public static CompDto ToDto(Comp c) => new(
        c.CompId,
        c.Address,
        c.City,
        c.State,
        c.Zip,
        c.Market,
        c.PropertyType,
        c.SquareFootage,
        c.YearBuilt,
        c.SalePrice,
        c.PricePerSf,
        c.CapRate,
        c.SaleDate,
        c.Buyer,
        c.Seller
    );

    public static CompDetailDto ToDetailDto(Comp c, CompInsightsDto? insights = null) => new(
        c.CompId,
        c.Address,
        c.City,
        c.State,
        c.Zip,
        c.Market,
        c.PropertyType,
        c.SquareFootage,
        c.YearBuilt,
        c.SalePrice,
        c.PricePerSf,
        c.CapRate,
        c.SaleDate,
        c.Buyer,
        c.Seller,
        c.Notes
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => new NoteDto(n.Id, n.CompId, n.NoteText, n.CreatedAt))
            .ToList(),
        c.Tags
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new TagDto(t.Id, t.CompId, t.Tag, t.CreatedAt))
            .ToList(),
        insights
    );
}
