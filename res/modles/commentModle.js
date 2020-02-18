/**
 * comment's databse modle
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const commentSchema = new schema({
    userId: String,
    postId: String,
    comment: String,
    datetime: String
});

module.exports = mongoose.model('Comment', commentSchema);
