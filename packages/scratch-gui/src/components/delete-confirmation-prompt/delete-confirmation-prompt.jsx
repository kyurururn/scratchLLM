import {defineMessages, FormattedMessage, injectIntl, intlShape} from 'react-intl';
import React from 'react';
import PropTypes from 'prop-types';

import Box from '../box/box.jsx';
import ReactModal from 'react-modal';
import deleteIcon from './icon--delete.svg';
import undoIcon from './icon--undo.svg';

import styles from './delete-confirmation-prompt.css';

// TODO: Pass those from outside if we want to reuse this component
const messages = defineMessages({
    shouldDeleteSpriteMessage: {
        defaultMessage: 'Are you sure you want to delete this sprite?',
        description: 'Message to indicate whether selected sprite should be deleted.',
        id: 'gui.gui.shouldDeleteSprite'
    },
    confirmOption: {
        defaultMessage: 'yes',
        description: 'Yes - should delete the sprite',
        id: 'gui.gui.confirm'
    },
    cancelOption: {
        defaultMessage: 'no',
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
    <ReactModal
        isOpen
        className={styles.modalContent}
        contentLabel={intl.formatMessage(messages.confirmDeletionHeading)}
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
                    <img
                        className={styles.deleteIcon}
                        src={deleteIcon}
                    />
                    <div className={styles.message}>
                        <FormattedMessage {...messages.confirmOption} />
                    </div>
                </button>
                <button
                    className={styles.cancelButton}
                    onClick={onCancel}
                    role="button"
                >
                    <img
                        className={styles.deleteIcon}
                        src={undoIcon}
                    />
                    <div className={styles.message}>
                        <FormattedMessage {...messages.cancelOption} />
                    </div>
                </button>
            </Box>
        </Box>
    </ReactModal>
);

DeleteConfirmationPrompt.propTypes = {
    onOk: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    intl: intlShape.isRequired
};

const DeleteConfirmationPromptIntl = injectIntl(DeleteConfirmationPrompt);

export default DeleteConfirmationPromptIntl;
