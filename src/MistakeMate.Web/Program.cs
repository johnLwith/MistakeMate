using Microsoft.EntityFrameworkCore;
using MistakeMate.Data;
using MistakeMate.Services;
using MistakeMate.Converters;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddDbContext<MistakeDbContext>(options =>
    options.UseSqlite("Data Source=App_Data/mistakes.db"));

builder.Services.AddScoped<IPhotoService, PhotoService>();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        options.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter());
        options.JsonSerializerOptions.WriteIndented = false;
    });

// Add CORS to allow frontend to call API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configure photos directory
var photosDirectory = Path.Combine(builder.Environment.ContentRootPath, "App_Data", "photos");
builder.Configuration["PhotosDirectory"] = photosDirectory;

var app = builder.Build();

// Ensure photos directory exists
if (!Directory.Exists(photosDirectory))
{
    Directory.CreateDirectory(photosDirectory);
}

// Ensure database is created
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<MistakeDbContext>();
    context.Database.EnsureCreated();
}

app.UseCors("AllowFrontend");
app.UseStaticFiles();

// Serve photos from the photos directory
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(photosDirectory),
    RequestPath = "/photos"
});

app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
