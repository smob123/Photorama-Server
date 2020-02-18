/**
 * user's databse modle
 */
const mongoose = require('mongoose');
const schema = mongoose.Schema;

const avatarSchema = new schema({
    userId: String,
    buffer: String
});

module.exports = mongoose.model('Avatar', avatarSchema);
