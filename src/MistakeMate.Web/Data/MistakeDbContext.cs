using Microsoft.EntityFrameworkCore;
using MistakeMate.Models;

namespace MistakeMate.Data
{
    public class MistakeDbContext : DbContext
    {
        public MistakeDbContext(DbContextOptions<MistakeDbContext> options) : base(options)
        {
        }

        public DbSet<Mistake> Mistakes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Mistake>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Description).IsRequired();
                entity.Property(e => e.PhotoPath).IsRequired();
                entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            });
        }
    }
}