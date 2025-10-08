let stream = null;
let capturedImageData = null;
let originalImageData = null;

// Initialize camera when page loads
window.onload = function() {
    initCamera();
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

    // Store original high-quality image
    originalImageData = canvas.toDataURL('image/jpeg', 0.95);

    // Store compressed image for gallery
    capturedImageData = compressImage(canvas);

    showPhotoPreview(capturedImageData);
}

function compressImage(canvas, quality = 0.8) {
    // Start with high quality for better visibility
    let compressedData = canvas.toDataURL('image/jpeg', quality);

    // If still too large (data URLs over ~2MB), try moderate quality
    if (compressedData.length > 2000000) {
        compressedData = canvas.toDataURL('image/jpeg', 0.7);
    }

    // If still too large, try lower quality
    if (compressedData.length > 2000000) {
        compressedData = canvas.toDataURL('image/jpeg', 0.6);
    }

    // If still too large, reduce canvas size but maintain good quality
    if (compressedData.length > 2000000) {
        const smallerCanvas = document.createElement('canvas');
        const maxSize = 1200; // Increased from 800 for better quality
        const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height);

        smallerCanvas.width = canvas.width * scale;
        smallerCanvas.height = canvas.height * scale;

        const ctx = smallerCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);

        compressedData = smallerCanvas.toDataURL('image/jpeg', 0.7); // Higher quality after resize
    }

    // Last resort: smaller canvas with lower quality
    if (compressedData.length > 2000000) {
        const smallerCanvas = document.createElement('canvas');
        const maxSize = 900; // Still bigger than the original 800
        const scale = Math.min(maxSize / canvas.width, maxSize / canvas.height);

        smallerCanvas.width = canvas.width * scale;
        smallerCanvas.height = canvas.height * scale;

        const ctx = smallerCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);

        compressedData = smallerCanvas.toDataURL('image/jpeg', 0.5);
    }

    console.log(`Compressed image size: ${(compressedData.length / 1024 / 1024).toFixed(2)}MB`);
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

                // Store original high-quality image
                originalImageData = canvas.toDataURL('image/jpeg', 0.95);

                // Store compressed image for gallery
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
    originalImageData = null;
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

        // Redirect to list page after successful save
        setTimeout(() => {
            window.location.href = 'list.html';
        }, 2000);
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
                photo: mistake.photo,
                originalPhoto: originalImageData
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to save mistake: ${errorText}`);
        }
    } catch (error) {
        throw new Error('Could not save mistake to server: ' + error.message);
    }
}

function resetForm() {
    document.getElementById('mistake-form').reset();
    retakePhoto();
}

function showSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'success-message';
    message.textContent = '✅ Mistake saved successfully! Redirecting to list...';
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