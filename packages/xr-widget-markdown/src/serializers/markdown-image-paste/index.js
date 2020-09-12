
let i = 0
/**
 * getAsset('test.jpg') => returns an AssetProxy
 *
 */
export const detectExternalImagesInAST = async (ast, { addCustomAsset }) => {
  for (const line of ast.nodes) {
    if (line.type !== 'shortcode') {
      continue;
    }
    if (line.data.shortcode !== 'image') {
      continue;
    }
    if (!line.data.shortcodeData || !line.data.shortcodeData.image) {
      continue;
    }
    const url = line.data.shortcodeData.image;
    if (url.indexOf('http') !== 0) {
      continue;
    }

    const blob = await fetch(url).then(response => response.blob());
    const file = new File([blob], 'img-' + i++)
    await addCustomAsset(file)

    const objectURL = URL.createObjectURL(blob);
    line.data.shortcodeData.image = objectURL

    console.log('image added')
  }
};

async function getImageAsBlob(url) {
  const blob = await fetch(url).then(response => response.blob());

  if (blob.size <= 0) {
    return '';
  }

  const objectURL = URL.createObjectURL(blob);
  const path = getPathForBlobURL(blob, objectURL);

  return { url: objectURL, path };
}

function getPathForBlobURL(blob, objectURL) {
  const guid = objectURL.substr(objectURL.lastIndexOf('/') + 1);

  let extension = '';
  if (blob.type === 'image/jpeg') {
    extension = '.jpg';
  } else if (blob.type === 'image/png') {
    extension = '.png';
  } else if (blob.type === 'image/gif') {
    extension = '.png';
  } else if (blob.type === 'image/webp') {
    extension = '.webp';
  }

  return `/assets/uploads/${guid}${extension}`;
}
