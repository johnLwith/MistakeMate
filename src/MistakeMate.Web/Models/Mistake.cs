using System.ComponentModel.DataAnnotations;

namespace MistakeMate.Models
{
    public class Mistake
    {
        public int Id { get; set; }

        [Required]
        public string Description { get; set; } = string.Empty;

        [Required]
        public string PhotoPath { get; set; } = string.Empty;

        [Required]
        public string OriginalPhotoPath { get; set; } = string.Empty;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}