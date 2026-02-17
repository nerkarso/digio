async function tryCatch(promise) {
  try {
    const value = await promise;
    return [value, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}

async function getAverageColor(imageUrl) {
  if (!imageUrl) return 'transparent';
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 1;
      canvas.height = 1;
      ctx.drawImage(img, 0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      resolve(`rgb(${data[0]}, ${data[1]}, ${data[2]})`);
    };
    img.onerror = () => {
      resolve('transparent');
    };
    img.src = imageUrl;
  });
}
