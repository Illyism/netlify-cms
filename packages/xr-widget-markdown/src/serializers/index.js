import { trimEnd } from 'lodash';
import unified from 'unified';
import u from 'unist-builder';
import markdownToRemarkPlugin from 'remark-parse';
import remarkToMarkdownPlugin from 'remark-stringify';
import remarkToRehype from 'remark-rehype';
import rehypeToHtml from 'rehype-stringify';
import remarkToRehypeShortcodes from './remarkRehypeShortcodes';
import remarkWrapHtml from './remarkWrapHtml';
import remarkToSlate from './remarkSlate';
import remarkSquashReferences from './remarkSquashReferences';
import { remarkParseShortcodes, createRemarkShortcodeStringifier } from './remarkShortcodes';
import remarkEscapeMarkdownEntities from './remarkEscapeMarkdownEntities';
import remarkStripTrailingBreaks from './remarkStripTrailingBreaks';
import remarkAllowHtmlEntities from './remarkAllowHtmlEntities';
import slateToRemark from './slateRemark';
import { getEditorComponents } from '../MarkdownControl';

/**
 * This module contains all serializers for the Markdown widget.
 *
 * The value of a Markdown widget is transformed to various formats during
 * editing, and these formats are referenced throughout serializer source
 * documentation. Below is brief glossary of the formats used.
 *
 * - Markdown {string}
 *   The stringified Markdown value. The value of the field is persisted
 *   (stored) in this format, and the stringified value is also used when the
 *   editor is in "raw" Markdown mode.
 *
 * - MDAST {object}
 *   Also loosely referred to as "Remark". MDAST stands for MarkDown AST
 *   (Abstract Syntax Tree), and is an object representation of a Markdown
 *   document. Underneath, it's a Unist tree with a Markdown-specific schema.
 *   MDAST syntax is a part of the Unified ecosystem, and powers the Remark
 *   processor, so Remark plugins may be used.
 *
 * - HAST {object}
 *   Also loosely referred to as "Rehype". HAST, similar to MDAST, is an object
 *   representation of an HTML document.  The field value takes this format
 *   temporarily before the document is stringified to HTML.
 *
 * - HTML {string}
 *   The field value is stringifed to HTML for preview purposes - the HTML value
 *   is never parsed, it is output only.
 *
 * - Slate Raw AST {object}
 *   Slate's Raw AST is a very simple and unopinionated object representation of
 *   a document in a Slate editor. We define our own Markdown-specific schema
 *   for serialization to/from Slate's Raw AST and MDAST.
 */

/**
 * Deserialize a Markdown string to an MDAST.
 */
export const markdownToRemark = markdown => {
  /**
   * Parse the Markdown string input to an MDAST.
   */
  const parsed = unified()
    .use(markdownToRemarkPlugin, { fences: true, commonmark: true })
    .use(markdownToRemarkRemoveTokenizers, { inlineTokenizers: ['url'] })
    .use(remarkParseShortcodes, { plugins: getEditorComponents() })
    .use(remarkAllowHtmlEntities)
    .parse(markdown);

  /**
   * Further transform the MDAST with plugins.
   */
  const result = unified()
    .use(remarkSquashReferences)
    .runSync(parsed);

  return result;
};

/**
 * Remove named tokenizers from the parser, effectively deactivating them.
 */
function markdownToRemarkRemoveTokenizers({ inlineTokenizers }) {
  inlineTokenizers &&
    inlineTokenizers.forEach(tokenizer => {
      delete this.Parser.prototype.inlineTokenizers[tokenizer];
    });
}

/**
 * Serialize an MDAST to a Markdown string.
 */
export const remarkToMarkdown = obj => {
  /**
   * Rewrite the remark-stringify text visitor to simply return the text value,
   * without encoding or escaping any characters. This means we're completely
   * trusting the markdown that we receive.
   */
  function remarkAllowAllText() {
    const Compiler = this.Compiler;
    const visitors = Compiler.prototype.visitors;
    visitors.text = node => node.value;
  }

  /**
   * Provide an empty MDAST if no value is provided.
   */
  const mdast = obj || u('root', [u('paragraph', [u('text', '')])]);

  const remarkToMarkdownPluginOpts = {
    commonmark: true,
    fences: true,
    listItemIndent: '1',

    /**
     * Use asterisk for everything, it's the most versatile. Eventually using
     * other characters should be an option.
     */
    bullet: '*',
    emphasis: '*',
    strong: '*',
    rule: '-',
  };

  /**
   * Transform the MDAST with plugins.
   */
  const processedMdast = unified()
    .use(remarkEscapeMarkdownEntities)
    .use(remarkStripTrailingBreaks)
    .runSync(mdast);

  const markdown = unified()
    .use(remarkToMarkdownPlugin, remarkToMarkdownPluginOpts)
    .use(remarkAllowAllText)
    .use(createRemarkShortcodeStringifier({ plugins: getEditorComponents() }))
    .stringify(processedMdast)
    .replace(/\r?/g, '');

  /**
   * Return markdown with trailing whitespace removed.
   */
  return trimEnd(markdown);
};

/**
 * Convert Markdown to HTML.
 */
export const markdownToHtml = (markdown, { getAsset, resolveWidget } = {}) => {
  const mdast = markdownToRemark(markdown);

  const hast = unified()
    .use(remarkToRehypeShortcodes, { plugins: getEditorComponents(), getAsset, resolveWidget })
    .use(remarkToRehype, { allowDangerousHTML: true })
    .runSync(mdast);

  const html = unified()
    .use(rehypeToHtml, {
      allowDangerousHtml: true,
      allowDangerousCharacters: true,
      closeSelfClosing: true,
      entities: { useNamedReferences: true },
    })
    .stringify(hast);

  return html;
};

/**
 * Convert Markdown to Slate's Raw AST.
 */
export const markdownToSlate = (markdown, { voidCodeBlock } = {}) => {
  const mdast = markdownToRemark(markdown);

  const slateRaw = unified()
    .use(remarkWrapHtml)
    .use(remarkToSlate, { voidCodeBlock })
    .runSync(mdast);

  return slateRaw;
};

/**
 * Convert a Slate Raw AST to Markdown.
 *
 * Requires shortcode plugins to parse shortcode nodes back to text.
 *
 * Note that Unified is not utilized for the conversion from Slate's Raw AST to
 * MDAST. The conversion is manual because Unified can only operate on Unist
 * trees.
 */
export const slateToMarkdown = (raw, { voidCodeBlock } = {}) => {
  const mdast = slateToRemark(raw, { voidCodeBlock });
  const markdown = remarkToMarkdown(mdast);
  return markdown;
};
