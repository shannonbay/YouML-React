import React, { useEffect } from 'react';

function ImageUploadButton() {
  useEffect(() => {
    const imageUploadInput = document.getElementById('imageUpload');

    if (imageUploadInput) {
      imageUploadInput.addEventListener('change', function(event) {
        const file = event.target.files[0];

        if (file) {
          const reader = new FileReader();

          reader.onload = function(e) {
            const thumbnailContainer = document.getElementById('thumbnailContainer');

            if (thumbnailContainer) {
              thumbnailContainer.innerHTML = '';

              const img = document.createElement('img');
              img.src = e.target.result;
              img.style.width = '100px';
              img.style.height = '100px';
              img.style.objectFit = 'cover';

              thumbnailContainer.appendChild(img);
            }
          };

          reader.readAsDataURL(file);
        }
      });
    }
  }, []); // Empty dependency array ensures the effect runs only once, after the component mounts

  return (
    <div id='upload'>
      <input id='imageUpload' type="file" accept="image/*" />
      <div id="thumbnailContainer" className="thumbnail-container"></div>
    </div>
  );
}

export default ImageUploadButton;
