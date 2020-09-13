import { Document } from 'slate';
import { setEventTransfer } from 'slate-react';
import base64 from 'slate-base64-serializer';
import isHotkey from 'is-hotkey';
import { slateToMarkdown, markdownToSlate, markdownToHtml } from '../../serializers';
import { htmlToMarkdown } from '../../serializers/html-to-markdown';
import saveExternalImagesLocally from '../../serializers/markdown-images/saveExternalImagesLocally';

// import { actions as notifActions } from 'redux-notifications';
// const { notifSend } = notifActions

const CopyPasteVisual = ({ addCustomAsset, getAsset, resolveWidget }) => {
  const handleCopy = (event, editor) => {
    const markdown = slateToMarkdown(editor.value.fragment.toJS());
    const html = markdownToHtml(markdown, { getAsset, resolveWidget });
    setEventTransfer(event, 'text', markdown);
    setEventTransfer(event, 'html', html);
    setEventTransfer(event, 'fragment', base64.serializeNode(editor.value.fragment));
    event.preventDefault();
  };

  return {
    async onPaste(event, editor, next) {
      const data = event.clipboardData;
      if (isHotkey('shift', event)) {
        return next();
      }

      // store.dispatch(notifSend({
      //   message: 'Pasting...',
      //   dismissAfter: 20000,
      //   kind: 'success',
      // }))

      // console.log({store})

      if (data.types.includes('application/x-slate-fragment')) {
        const sast = data.getData('application/x-slate-fragment');
        const fragment = base64.deserializeNode(sast);
        console.log(sast, fragment, fragment.toJSON());
        return editor.insertFragment(fragment);
      }

      const html = data.types.includes('text/html') && data.getData('text/html');
      let markdown = '';
      if (html) {
        markdown = htmlToMarkdown(html);
      } else {
        markdown = data.getData('text/plain');
      }
      
      markdown = await saveExternalImagesLocally(markdown, { addCustomAsset });
      console.log(markdown)
      
      const ast = markdownToSlate(markdown)
      const doc = Document.fromJSON(ast);
      return editor.insertFragment(doc);
    },
    onCopy(event, editor, next) {
      handleCopy(event, editor, next);
    },
    onCut(event, editor, next) {
      handleCopy(event, editor, next);
      editor.delete();
    },
  };
};

export default CopyPasteVisual;
