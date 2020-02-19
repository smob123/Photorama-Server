/**
 * post's databse modle
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const postSchema = new schema({
    userId: String,
    image: String,
    datetime: Date,
    description: String,
    likes: [String],
    comments: [String],
    hashtags: [String]
});

module.exports = mongoose.model('Post', postSchema);
