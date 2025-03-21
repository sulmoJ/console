import { Plugin } from 'prosemirror-state';

import type { ImageUploader } from '@/common/components/editor/extensions/image/type';

const LOADING_IMAGE_NODE = {
    src: '/loading-spinner.gif',
    'data-loading': true,
    style: 'max-width: 2rem; max-height: 2rem;',
};
export const dropImagePlugin = (upload: ImageUploader) => new Plugin({
    props: {
        handleDOMEvents: {
            paste: (view, _event: Event) => {
                // event param must be Event type. don't change it to ClipboardEvent type.
                const event = _event as ClipboardEvent;
                const items = Array.from(event.clipboardData?.items || []);
                const { schema } = view.state;

                items.forEach((item) => {
                    const image = item.getAsFile();

                    if (item.type.indexOf('image') === 0) {
                        event.preventDefault();

                        if (upload && image) {
                            // add loading node
                            const loadingNode = schema.nodes.image.create(LOADING_IMAGE_NODE);
                            const loadingTransaction = view.state.tr.replaceSelectionWith(loadingNode);
                            view.dispatch(loadingTransaction);

                            // upload and replace the loading node with the uploaded image node
                            upload(image).then(({ downloadUrl, fileId }) => {
                                const imageNode = schema.nodes.image.create({
                                    src: downloadUrl,
                                    'file-id': fileId,
                                });
                                const loadingPos = view.state.selection.anchor - 1; // get the position of the loading node
                                const transaction = view.state.tr.setNodeMarkup(loadingPos, schema.nodes.image, imageNode.attrs);
                                view.dispatch(transaction);
                            });
                        }
                    } else {
                        const reader = new FileReader();
                        reader.onload = (readerEvent) => {
                            const node = schema.nodes.image.create({
                                src: readerEvent.target?.result,
                            });
                            const transaction = view.state.tr.replaceSelectionWith(node);
                            view.dispatch(transaction);
                        };
                        if (!image) return;
                        reader.readAsDataURL(image);
                    }
                });

                return false;
            },
            drop: (view, _event: Event) => {
                // event param must be Event type. don't change it to DragEvent type.
                const event = _event as DragEvent;
                const hasFiles = !!event.dataTransfer?.files?.length;

                if (!hasFiles) return false;

                const images = Array.from(
                    event.dataTransfer?.files ?? [],
                ).filter((file) => /image/i.test(file.type));

                if (images.length === 0) return false;

                event.preventDefault();

                const { schema } = view.state;
                const coordinates = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY,
                });
                if (!coordinates) return false;

                images.forEach(async (image) => {
                    const reader = new FileReader();

                    if (upload) {
                        // add loading node
                        const loadingNode = schema.nodes.image.create(LOADING_IMAGE_NODE);
                        const loadingTransaction = view.state.tr.replaceSelectionWith(loadingNode);
                        view.dispatch(loadingTransaction);

                        // upload and replace the loading node with the uploaded image node
                        const { downloadUrl, fileId } = await upload(image);
                        const imageNode = schema.nodes.image.create({
                            src: downloadUrl,
                            'file-id': fileId,
                        });
                        const loadingPos = view.state.selection.anchor - 1; // get the position of the loading node
                        const transaction = view.state.tr.setNodeMarkup(loadingPos, schema.nodes.image, imageNode.attrs);
                        view.dispatch(transaction);
                    } else {
                        reader.onload = (readerEvent) => {
                            const node = schema.nodes.image.create({
                                src: readerEvent.target?.result,
                            });
                            const transaction = view.state.tr.insert(coordinates.pos, node);
                            view.dispatch(transaction);
                        };
                        reader.readAsDataURL(image);
                    }
                });

                return true;
            },
        },
    },
});
