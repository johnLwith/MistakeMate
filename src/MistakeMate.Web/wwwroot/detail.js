let currentMistake = null;

// Load mistake details when page loads
window.onload = function() {
    loadMistakeDetail();
    setupEventListeners();
};

function getMistakeIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

async function loadMistakeDetail() {
    const mistakeId = getMistakeIdFromUrl();

    if (!mistakeId) {
        showError('No mistake ID provided');
        return;
    }

    try {
        const response = await fetch(`/api/mistakes/${mistakeId}`);

        if (!response.ok) {
            if (response.status === 404) {
                showError('Mistake not found');
            } else {
                showError('Failed to load mistake details');
            }
            return;
        }

        const mistake = await response.json();
        currentMistake = mistake;
        displayMistakeDetail(mistake);
    } catch (error) {
        console.error('Error loading mistake detail:', error);
        showError('Error loading mistake details');
    }
}

function displayMistakeDetail(mistake) {
    // Hide loading state
    document.getElementById('loading').style.display = 'none';

    // Set basic details
    document.getElementById('detail-date').textContent = formatDate(mistake.createdAt);
    document.getElementById('detail-time').textContent = formatTime(mistake.createdAt);
    document.getElementById('detail-description').textContent = mistake.description;
    document.getElementById('detail-photo').src = `/api/mistakes/photo/${mistake.id}/original`;

    // Set time ago
    document.getElementById('time-ago').textContent = getTimeAgo(mistake.createdAt);

  
    // Show detail content
    document.getElementById('mistake-detail').style.display = 'block';
}


function setupEventListeners() {
    // Delete button
    document.getElementById('delete-btn').addEventListener('click', handleDelete);

    // View fullsize photo
    document.getElementById('view-fullsize').addEventListener('click', showPhotoModal);

    // Download photo
    document.getElementById('download-photo').addEventListener('click', downloadPhoto);

    // Share button
    document.getElementById('share-btn').addEventListener('click', shareLearning);

    // Modal close button
    document.querySelector('.close-modal').addEventListener('click', closePhotoModal);

    // Close modal on background click
    document.getElementById('photo-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closePhotoModal();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closePhotoModal();
        }
    });
}

async function handleDelete() {
    if (!currentMistake) return;

    const confirmed = confirm('Are you sure you want to delete this mistake record? This action cannot be undone.');
    if (!confirmed) return;

    try {
        const response = await fetch(`/api/mistakes/${currentMistake.id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete mistake');
        }

        showSuccessMessage('Mistake deleted successfully! Redirecting to list...');
        setTimeout(() => {
            window.location.href = 'list.html';
        }, 2000);
    } catch (error) {
        alert('Error deleting mistake: ' + error.message);
    }
}

function showPhotoModal() {
    const modal = document.getElementById('photo-modal');
    const modalPhoto = document.getElementById('modal-photo');

    modalPhoto.src = `/api/mistakes/photo/${currentMistake.id}/original`;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closePhotoModal() {
    const modal = document.getElementById('photo-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function downloadPhoto() {
    if (!currentMistake) return;

    const link = document.createElement('a');
    link.href = `/api/mistakes/photo/${currentMistake.id}/original`;
    link.download = `mistake_${currentMistake.id}_${formatDateForFilename(currentMistake.createdAt)}.jpg`;
    link.click();
}

function shareLearning() {
    if (!currentMistake) return;

    const shareText = `Today I learned from a mistake: "${currentMistake.description}". Every mistake is an opportunity to grow! #MistakeMate #LearningJourney`;

    if (navigator.share) {
        navigator.share({
            title: 'Learning from Mistakes',
            text: shareText,
            url: window.location.href
        }).catch(err => console.log('Error sharing:', err));
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(shareText).then(() => {
            showSuccessMessage('Learning copied to clipboard!');
        }).catch(() => {
            // Fallback: show text to copy manually
            prompt('Copy this text to share:', shareText);
        });
    }
}

function showError(message) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').querySelector('p').textContent = message;
    document.getElementById('error').style.display = 'block';
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

// Date formatting functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatDateForFilename(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

function getTimeAgo(dateString) {
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
    return `${Math.floor(diffDays / 365)} years ago`;
}