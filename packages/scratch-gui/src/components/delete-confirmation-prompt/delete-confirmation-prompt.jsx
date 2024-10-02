import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import React from 'react';
import PropTypes from 'prop-types';

import Box from '../box/box.jsx';
import Modal from '../../containers/modal.jsx';

import styles from './delete-confirmation-prompt.css';

// TODO: Pass those from outside if we want to reuse this component
const messages = defineMessages({
    shouldDeleteSpriteMessage: {
        defaultMessage: 'Are you sure you want to delete this sprite?',
        description: 'Message to indicate whether selected sprite should be deleted.',
        id: 'gui.gui.shouldDeleteSprite'
    },
    confirmOption: {
        defaultMessage: 'Yes',
        description: 'Yes - should delete the sprite',
        id: 'gui.gui.confirm'
    },
    cancelOption: {
        defaultMessage: 'No',
        description: 'No - cancel deletion',
        id: 'gui.gui.cancel'
    },
    confirmDeletionHeading: {
        defaultMessage: 'Confirm Asset Deletion',
        description: 'Heading of confirmation prompt to delete asset',
        id: 'gui.gui.deleteAssetHeading'
    }
});

const DeleteConfirmationPrompt = ({
    intl,
    onCancel,
    onOk
}) => (
    <Modal
        contentLabel={intl.formatMessage(messages.confirmDeletionHeading)}
        className={styles.modalContent}
        onRequestClose={onCancel}
    >
        <Box className={styles.body}>
            <Box className={styles.label}>
                <FormattedMessage {...messages.shouldDeleteSpriteMessage} />
            </Box>
            <Box className={styles.buttonRow}>
                <button
                    className={styles.okButton}
                    onClick={onOk}
                    role="button"
                >
                    <FormattedMessage {...messages.confirmOption} />
                </button>
                <button
                    className={styles.cancelButton}
                    onClick={onCancel}
                    role="button"
                >
                    <FormattedMessage {...messages.cancelOption} />
                </button>
            </Box>
        </Box>
    </Modal>
);

DeleteConfirmationPrompt.propTypes = {
    onOk: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    intl: intlShape.isRequired
};

const DeleteConfirmationPromptIntl = injectIntl(DeleteConfirmationPrompt);

export default DeleteConfirmationPromptIntl;
