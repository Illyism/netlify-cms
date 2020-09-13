import { markdownToSlate } from '../../serializers';

/**
 * getAsset('test.jpg') => returns an AssetProxy
 * @param {string} markdown
 */
export default function getPreviewImage(markdown, { getAsset }) {
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
        if (url.indexOf('http') > -1) {
            continue; // already remote url
        }
        const asset = getAsset(url)
        if (asset.url) {
            markdown = markdown.replaceAll(url, asset.url)
            console.log('Rehyped: %s => %s', url, asset.url)
        }
    }

    return markdown
};
