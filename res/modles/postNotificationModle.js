/**
 * post notification's databse modle
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const postNotificationSchema = new schema({
    userId: String,
    interactorId: String,
    postId: String,
    commentId: String,
    message: String,
    datetime: String
});

module.exports = mongoose.model('PostNotification', postNotificationSchema);
