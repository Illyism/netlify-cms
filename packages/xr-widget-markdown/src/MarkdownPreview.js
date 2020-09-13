import React from 'react';
import PropTypes from 'prop-types';
import { WidgetPreviewContainer } from 'netlify-cms-ui-default';
import { markdownToHtml } from './serializers';
import getPreviewImages from './serializers/markdown-images/getPreviewImages';

class MarkdownPreview extends React.Component {
  static propTypes = {
    getAsset: PropTypes.func.isRequired,
    value: PropTypes.string,
  };

  render() {
    const { value, getAsset } = this.props;
    if (value === null) {
      return null;
    }

    const markdown = getPreviewImages(value, { getAsset })
    const html = markdownToHtml(markdown);

    return <WidgetPreviewContainer dangerouslySetInnerHTML={{ __html: html }} />;
  }
}

export default MarkdownPreview;
