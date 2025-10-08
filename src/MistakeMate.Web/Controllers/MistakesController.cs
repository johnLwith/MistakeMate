using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MistakeMate.Data;
using MistakeMate.Models;
using MistakeMate.Services;

namespace MistakeMate.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MistakesController : ControllerBase
    {
        private readonly MistakeDbContext _context;
        private readonly IPhotoService _photoService;

        public MistakesController(MistakeDbContext context, IPhotoService photoService)
        {
            _context = context;
            _photoService = photoService;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Mistake>>> GetMistakes()
        {
            var mistakes = await _context.Mistakes
                .OrderByDescending(m => m.CreatedAt)
                .ToListAsync();

            return Ok(mistakes);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Mistake>> GetMistake(int id)
        {
            var mistake = await _context.Mistakes.FindAsync(id);

            if (mistake == null)
            {
                return NotFound();
            }

            return Ok(mistake);
        }

        [HttpPost]
        public async Task<ActionResult<Mistake>> CreateMistake([FromBody] CreateMistakeRequest request)
        {
            if (string.IsNullOrEmpty(request.Description) || string.IsNullOrEmpty(request.Photo) || string.IsNullOrEmpty(request.OriginalPhoto))
            {
                return BadRequest("Description, photo, and original photo are required");
            }

            try
            {
                // Save both compressed and original photos to file system
                var fileName = $"mistake_{DateTime.UtcNow:yyyyMMddHHmmss}.jpg";
                var (compressedPath, originalPath) = await _photoService.SavePhotoAsync(request.Photo, request.OriginalPhoto, fileName);

                // Create mistake record
                var mistake = new Mistake
                {
                    Description = request.Description,
                    PhotoPath = compressedPath,
                    OriginalPhotoPath = originalPath,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Mistakes.Add(mistake);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetMistake), new { id = mistake.Id }, mistake);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error creating mistake: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMistake(int id)
        {
            var mistake = await _context.Mistakes.FindAsync(id);
            if (mistake == null)
            {
                return NotFound();
            }

            try
            {
                // Delete both photos from file system
                await _photoService.DeleteBothPhotosAsync(mistake.PhotoPath, mistake.OriginalPhotoPath);

                // Delete from database
                _context.Mistakes.Remove(mistake);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error deleting mistake: {ex.Message}");
            }
        }

        [HttpGet("photo/{id}")]
        public async Task<IActionResult> GetPhoto(int id)
        {
            var mistake = await _context.Mistakes.FindAsync(id);
            if (mistake == null)
            {
                return NotFound();
            }

            if (!System.IO.File.Exists(mistake.PhotoPath))
            {
                return NotFound("Compressed photo file not found");
            }

            var imageBytes = await System.IO.File.ReadAllBytesAsync(mistake.PhotoPath);
            return File(imageBytes, "image/jpeg");
        }

        [HttpGet("photo/{id}/original")]
        public async Task<IActionResult> GetOriginalPhoto(int id)
        {
            var mistake = await _context.Mistakes.FindAsync(id);
            if (mistake == null)
            {
                return NotFound();
            }

            if (!System.IO.File.Exists(mistake.OriginalPhotoPath))
            {
                return NotFound("Original photo file not found");
            }

            var imageBytes = await System.IO.File.ReadAllBytesAsync(mistake.OriginalPhotoPath);
            return File(imageBytes, "image/jpeg");
        }
    }

    public class CreateMistakeRequest
    {
        public string Description { get; set; } = string.Empty;
        public string Photo { get; set; } = string.Empty;
        public string OriginalPhoto { get; set; } = string.Empty;
    }
}