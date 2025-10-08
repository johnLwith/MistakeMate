let stream = null;
let capturedImageData = null;

// Initialize camera when page loads
window.onload = function() {
    initCamera();
    loadMistakes();
};

async function initCamera() {
    try {
        const video = document.getElementById('camera');
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
        video.srcObject = stream;
    } catch (error) {
        console.log('Camera access denied or not available:', error);
        document.getElementById('camera').style.display = 'none';
        document.getElementById('capture-btn').style.display = 'none';
        document.getElementById('upload-btn').style.display = 'block';
    }
}

function capturePhoto() {
    const video = document.getElementById('camera');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    capturedImageData = compressImage(canvas);
    showPhotoPreview(capturedImageData);
}

function compressImage(canvas, quality = 0.3) {
    // Try to compress the image to reduce file size
    let compressedData = canvas.toDataURL('image/jpeg', quality);

    // If still too large (data URLs over ~1MB), try even lower quality
    if (compressedData.length > 1000000) {
        compressedData = canvas.toDataURL('image/jpeg', 0.2);
    }

    // If still too large, reduce canvas size
    if (compressedData.length > 1000000) {
        const smallerCanvas = document.createElement('canvas');
        const maxSize = 800;
        const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height);

        smallerCanvas.width = canvas.width * scale;
        smallerCanvas.height = canvas.height * scale;

        const ctx = smallerCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);

        compressedData = smallerCanvas.toDataURL('image/jpeg', 0.2);
    }

    return compressedData;
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                capturedImageData = compressImage(canvas);
                showPhotoPreview(capturedImageData);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function showPhotoPreview(imageData) {
    document.getElementById('captured-photo').src = imageData;
    document.getElementById('photo-preview').style.display = 'block';
    document.querySelector('.camera-section').style.display = 'none';
    document.querySelector('.submit-btn').disabled = false;
}

function retakePhoto() {
    capturedImageData = null;
    document.getElementById('photo-preview').style.display = 'none';
    document.querySelector('.camera-section').style.display = 'block';
    document.querySelector('.submit-btn').disabled = true;
    document.getElementById('file-input').value = '';
}

// Handle form submission
async function handleFormSubmit(e) {
    if (e) e.preventDefault();

    if (!capturedImageData) {
        alert('Please take or upload a photo first');
        return;
    }

    const descriptionElement = document.getElementById('mistake-description');
    if (!descriptionElement) {
        alert('Error: Description field not found');
        return;
    }

    const mistakeDescription = descriptionElement.value;
    if (!mistakeDescription.trim()) {
        alert('Please enter a mistake description');
        return;
    }

    const mistake = {
        id: Date.now(),
        photo: capturedImageData,
        mistakeDescription: mistakeDescription,
        date: new Date().toISOString()
    };

    try {
        await saveMistake(mistake);
        resetForm();
        showSuccessMessage();
    } catch (error) {
        alert('Error saving mistake: ' + error.message);
    }
}

document.getElementById('mistake-form').addEventListener('submit', handleFormSubmit);

// Fallback for mobile browsers
document.querySelector('.submit-btn').addEventListener('click', async function(e) {
    e.preventDefault();
    await handleFormSubmit();
});

async function saveMistake(mistake) {
    try {
        const response = await fetch('/api/mistakes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: mistake.mistakeDescription,
                photo: mistake.photo
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to save mistake: ${errorText}`);
        }

        await loadMistakes();
    } catch (error) {
        throw new Error('Could not save mistake to server: ' + error.message);
    }
}

async function loadMistakes() {
    try {
        const response = await fetch('/api/mistakes');
        if (!response.ok) {
            throw new Error('Failed to load mistakes');
        }

        const mistakes = await response.json();
        const gallery = document.getElementById('gallery');

        if (mistakes.length === 0) {
            gallery.innerHTML = '<p id="no-mistakes">No mistakes recorded yet</p>';
            return;
        }

        gallery.innerHTML = mistakes.map(mistake => `
            <div class="mistake-card">
                <img src="/api/mistakes/photo/${mistake.id}" alt="Mistake photo" onclick="viewImage('/api/mistakes/photo/${mistake.id}')">
                <div class="mistake-info">
                    <p><strong>Description:</strong> ${mistake.description}</p>
                    <p><strong>Date:</strong> ${new Date(mistake.createdAt).toLocaleDateString()}</p>
                    <button onclick="deleteMistake(${mistake.id})" class="delete-btn">🗑️ Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading mistakes:', error);
        const gallery = document.getElementById('gallery');
        gallery.innerHTML = '<p id="no-mistakes">Error loading mistakes from server</p>';
    }
}

async function deleteMistake(id) {
    if (confirm('Are you sure you want to delete this mistake record?')) {
        try {
            const response = await fetch(`/api/mistakes/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete mistake: ${errorText}`);
            }

            await loadMistakes();
        } catch (error) {
            alert('Error deleting mistake: ' + error.message);
        }
    }
}

function viewImage(imageSrc) {
    window.open(imageSrc, '_blank');
}

function resetForm() {
    document.getElementById('mistake-form').reset();
    retakePhoto();
}

function showSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'success-message';
    message.textContent = '✅ Mistake saved successfully!';
    document.body.appendChild(message);

    setTimeout(() => {
        message.remove();
    }, 3000);
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Stop camera when page is closed
window.addEventListener('beforeunload', function() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});