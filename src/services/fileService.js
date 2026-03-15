const readAsDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(String(event.target?.result || ''));
    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });
};

const compressImageDataUrl = (dataUrl, quality = 0.78, maxSize = 1280) => {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');

      const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * ratio);
      canvas.height = Math.round(image.height * ratio);

      const context = canvas.getContext('2d');
      if (!context) {
        resolve(dataUrl);
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
};

export const toImagePayload = async (file) => {
  if (!file) return null;
  if (!String(file.type || '').startsWith('image/')) {
    throw new Error('Only image files are supported.');
  }

  const rawDataUrl = await readAsDataUrl(file);
  const compressedDataUrl = await compressImageDataUrl(rawDataUrl);

  if (compressedDataUrl.length > 350000) {
    throw new Error('Image is too large. Please choose a smaller image.');
  }

  return {
    name: file.name || 'image.jpg',
    mimeType: file.type || 'image/jpeg',
    dataUrl: compressedDataUrl
  };
};
