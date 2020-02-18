/**
 * follow notification's databse modle
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const followerNotificationSchema = new schema({
    userId: String,
    followerName: String,
    message: String,
    datetime: String
});

module.exports = mongoose.model('FollowerNotification', followerNotificationSchema);
