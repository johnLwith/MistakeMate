namespace MistakeMate.Services
{
    public interface IPhotoService
    {
        Task<(string compressedPath, string originalPath)> SavePhotoAsync(string compressedImage, string originalImage, string fileName);
        Task DeletePhotoAsync(string photoPath);
        Task DeleteBothPhotosAsync(string compressedPath, string originalPath);
    }

    public class PhotoService : IPhotoService
    {
        private readonly string _photosDirectory;

        public PhotoService(IConfiguration configuration)
        {
            _photosDirectory = configuration.GetValue<string>("PhotosDirectory") ?? "photos";

            // Ensure the directory exists
            if (!Directory.Exists(_photosDirectory))
            {
                Directory.CreateDirectory(_photosDirectory);
            }
        }

        public async Task<(string compressedPath, string originalPath)> SavePhotoAsync(string compressedImage, string originalImage, string fileName)
        {
            try
            {
                // Generate unique filename with timestamp
                var fileExtension = Path.GetExtension(fileName) ?? ".jpg";
                var timestamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
                var guid = Guid.NewGuid();

                // Save compressed image
                var compressedFileName = $"{timestamp}_{guid}_compressed{fileExtension}";
                var compressedPath = await SaveSinglePhotoAsync(compressedImage, compressedFileName);

                // Save original image
                var originalFileName = $"{timestamp}_{guid}_original{fileExtension}";
                var originalPath = await SaveSinglePhotoAsync(originalImage, originalFileName);

                return (compressedPath, originalPath);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to save photos: {ex.Message}", ex);
            }
        }

        private async Task<string> SaveSinglePhotoAsync(string base64Image, string fileName)
        {
            // Remove data URL prefix if present
            var base64Data = base64Image;
            if (base64Image.Contains(','))
            {
                base64Data = base64Image.Split(',')[1];
            }

            var imageBytes = Convert.FromBase64String(base64Data);
            var fullPath = Path.Combine(_photosDirectory, fileName);

            await File.WriteAllBytesAsync(fullPath, imageBytes);

            return Path.Combine(_photosDirectory, fileName);
        }

        public Task DeletePhotoAsync(string photoPath)
        {
            try
            {
                if (File.Exists(photoPath))
                {
                    File.Delete(photoPath);
                }
                return Task.CompletedTask;
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to delete photo: {ex.Message}", ex);
            }
        }

        public async Task DeleteBothPhotosAsync(string compressedPath, string originalPath)
        {
            try
            {
                await DeletePhotoAsync(compressedPath);
                await DeletePhotoAsync(originalPath);
            }
            catch (Exception ex)
            {
                throw new InvalidOperationException($"Failed to delete photos: {ex.Message}", ex);
            }
        }
    }
}