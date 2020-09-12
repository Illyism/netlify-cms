import unified from 'unified';
import htmlToRehype from 'rehype-parse';
import rehypeToRemark from 'rehype-remark';
import rehypePaperEmoji from '../rehypePaperEmoji';
import remarkAssertParents from '../remarkAssertParents';
import remarkPaddedLinks from '../remarkPaddedLinks';
import remarkWrapHtml from '../remarkWrapHtml';
import remarkToSlate from '../remarkSlate';

import htmlSanitizer from './sanitizer';
import TurndownService from 'turndown/lib/turndown.browser.umd';

let turndownService;

const turndownSettings = {
  // HTML to Markdown converter options
  // See https://github.com/domchristie/turndown
  headingStyle: 'atx',
  hr: '----------',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```',
  emDelimiter: '_',
  strongDelimiter: '**',
  linkStyle: 'inlined',
  linkReferenceStyle: 'full',
};

export const htmlToMarkdown = html => {
  // XR: we don't like the standard Netlify parser for Google docs
  // so we use Stackedit's method of going to markdown first, then we convert to Slate
  // https://github.com/benweet/stackedit/blob/fd6ac907bbd3cfbdc78e0660c2e3c0298bacd94e/src/services/editor/cledit/cleditCore.js#L346

  const sanitizedHtml = htmlSanitizer.sanitizeHtml(html).replace(/&#160;/g, ' '); // Replace non-breaking spaces with classic spaces
  if (!sanitizedHtml) {
    console.error('Could not sanitize html');
    return '';
  }

  if (!turndownService) {
    turndownService = new TurndownService(turndownSettings);
    turndownService.escape = str => str; // Disable escaping
  }

  const markdown = turndownService.turndown(sanitizedHtml);

  return markdown;
};

/**
 * Deserialize an HTML string to Slate's Raw AST. Currently used for HTML
 * pastes.
 *
 * @unused
 */
export const htmlToSlate = html => {
  const hast = unified()
    .use(htmlToRehype, { fragment: true })
    .parse(html);

  const mdast = unified()
    .use(rehypePaperEmoji)
    .use(rehypeToRemark, { minify: false })
    .runSync(hast);

  const slateRaw = unified()
    .use(remarkAssertParents)
    .use(remarkPaddedLinks)
    .use(remarkWrapHtml)
    .use(remarkToSlate)
    .runSync(mdast);

  return slateRaw;
};
