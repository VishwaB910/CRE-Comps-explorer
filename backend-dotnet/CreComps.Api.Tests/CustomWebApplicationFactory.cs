using CreComps.Api.Data;
using CreComps.Api.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CreComps.Api.Tests;

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            var toRemove = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>)
                            || (d.ServiceType.IsGenericType
                                && d.ServiceType.GetGenericTypeDefinition() == typeof(DbContextOptions<>))
                            || d.ServiceType == typeof(AppDbContext))
                .ToList();

            foreach (var descriptor in toRemove)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase("CreCompsTests"));
        });

        builder.UseEnvironment("Development");
    }

    public void ResetDatabase()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureDeleted();
        db.Database.EnsureCreated();
        db.Comps.AddRange(
            new Comp
            {
                CompId = 1,
                Address = "100 Main St",
                City = "Atlanta",
                State = "GA",
                Zip = "30301",
                Market = "Atlanta",
                PropertyType = "Office",
                SquareFootage = 100000,
                YearBuilt = 2010,
                SalePrice = 25000000,
                PricePerSf = 250.00m,
                CapRate = 6.00m,
                SaleDate = new DateOnly(2025, 11, 1),
                Buyer = "Buyer A",
                Seller = "Seller A",
            },
            new Comp
            {
                CompId = 2,
                Address = "200 Industrial Blvd",
                City = "Houston",
                State = "TX",
                Zip = "77001",
                Market = "Houston",
                PropertyType = "Industrial",
                SquareFootage = 200000,
                YearBuilt = 2015,
                SalePrice = 18000000,
                PricePerSf = 90.00m,
                CapRate = 7.50m,
                SaleDate = new DateOnly(2025, 9, 15),
                Buyer = "Buyer B",
                Seller = "Seller B",
            },
            new Comp
            {
                CompId = 3,
                Address = "50 Peachtree Rd",
                City = "Atlanta",
                State = "GA",
                Zip = "30319",
                Market = "Atlanta",
                PropertyType = "Retail",
                SquareFootage = 50000,
                YearBuilt = 2000,
                SalePrice = 9000000,
                PricePerSf = 180.00m,
                CapRate = 6.80m,
                SaleDate = new DateOnly(2025, 12, 20),
                Buyer = "Buyer C",
                Seller = "Seller C",
            });
        db.SaveChanges();
    }
}
