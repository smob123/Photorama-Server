/**
 * mention notification's databse modle
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const mentionNotificationSchema = new schema({
    userId: String,
    interactorId: String,
    mentionedUserId: String,
    commentId: String,
    postId: String,
    message: String,
    datetime: String
});

module.exports = mongoose.model('MentionNotification', mentionNotificationSchema);
