import { markdownToSlate } from '../';

/**
 * getAsset('test.jpg') => returns an AssetProxy
 * @param {string} markdown
 */
export default async function saveExternalImagesLocally(markdown, { addCustomAsset }) {
  const ast = markdownToSlate(markdown)
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
    if (url.indexOf('localhost') > -1) {
      continue;
    }

    const extracted = await extractImage(url, { addCustomAsset })
    if (extracted) {
      markdown = markdown.replaceAll(extracted.originalURL, extracted.path)
    }
  }

  return markdown
};

async function extractImage(originalURL, { addCustomAsset }) {
  const blob = await fetch(originalURL).then(response => response.blob());

  if (blob.size <= 0) {
    return
  }
  
  const objectURL = URL.createObjectURL(blob);
  const name = getNameForBlobURL(blob, objectURL);
  
  const file = new File([blob], name)
  await addCustomAsset(file) // add it to the store

  return {
    originalURL,
    objectURL,
    blob,
    file,
    name,
    path: `/assets/uploads/${name}`,
  }
}

function getNameForBlobURL(blob, objectURL) {
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

  return `${guid}${extension}`;
}
