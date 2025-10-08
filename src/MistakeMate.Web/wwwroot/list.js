// Load mistakes when page loads
window.onload = function() {
    loadMistakes();
    updateStats();
};

async function loadMistakes() {
    try {
        const response = await fetch('/api/mistakes');
        if (!response.ok) {
            throw new Error('Failed to load mistakes');
        }

        const mistakes = await response.json();
        const gallery = document.getElementById('gallery');

        if (mistakes.length === 0) {
            gallery.innerHTML = `
                <div class="empty-state">
                    <h3>🌟 Start Your Learning Journey!</h3>
                    <p>No mistakes recorded yet. Every mistake is an opportunity to learn and grow.</p>
                    <a href="index.html" class="cta-button">➕ Record Your First Mistake</a>
                </div>
            `;
            return;
        }

        gallery.innerHTML = mistakes.map(mistake => `
            <div class="mistake-card">
                <div class="mistake-image-container">
                    <a href="detail.html?id=${mistake.id}" class="mistake-link">
                        <img src="/api/mistakes/photo/${mistake.id}" alt="Mistake photo" class="mistake-image">
                    </a>
                    <div class="mistake-date">${formatDate(mistake.createdAt)}</div>
                </div>
                <div class="mistake-info">
                    <a href="detail.html?id=${mistake.id}" class="mistake-title">
                        <h3 class="mistake-description">${mistake.description}</h3>
                    </a>
                    <div class="mistake-actions">
                        <a href="detail.html?id=${mistake.id}" class="view-btn" title="View details">👁️ View</a>
                        <button onclick="deleteMistake(${mistake.id})" class="delete-btn" title="Delete this mistake">🗑️ Delete</button>
                    </div>
                </div>
            </div>
        `).join('');

        // Update stats after loading mistakes
        updateStats();
    } catch (error) {
        console.error('Error loading mistakes:', error);
        const gallery = document.getElementById('gallery');
        gallery.innerHTML = `
            <div class="error-state">
                <h3>❌ Error Loading Mistakes</h3>
                <p>Unable to load your mistakes from the server. Please try again later.</p>
                <button onclick="loadMistakes()" class="retry-btn">🔄 Retry</button>
            </div>
        `;
    }
}

async function updateStats() {
    try {
        const response = await fetch('/api/mistakes');
        if (!response.ok) return;

        const mistakes = await response.json();

        // Update total count
        document.getElementById('total-count').textContent = mistakes.length;

        // Calculate this month's mistakes
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const thisMonthMistakes = mistakes.filter(mistake => {
            const mistakeDate = new Date(mistake.createdAt);
            return mistakeDate.getMonth() === currentMonth && mistakeDate.getFullYear() === currentYear;
        });

        document.getElementById('month-count').textContent = thisMonthMistakes.length;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

async function deleteMistake(id) {
    if (confirm('Are you sure you want to delete this mistake record? This action cannot be undone.')) {
        try {
            const response = await fetch(`/api/mistakes/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete mistake: ${errorText}`);
            }

            // Reload the mistakes list
            await loadMistakes();
            showSuccessMessage('Mistake deleted successfully!');
        } catch (error) {
            alert('Error deleting mistake: ' + error.message);
        }
    }
}

function viewImage(imageSrc) {
    window.open(imageSrc, '_blank');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Check if it's the same day
    if (date.toDateString() === now.toDateString()) {
        return 'Today';
    }

    // Check if it was yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }

    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

    return date.toLocaleDateString();
}

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = '✅ ' + message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Auto-refresh every 30 seconds to catch new mistakes
setInterval(updateStats, 30000);