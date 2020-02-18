/**
 * hashtag's databse modle
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const hashtagSchema = new schema({
    postIds: [String],
    hashtag: String
});

module.exports = mongoose.model('Hashtag', hashtagSchema);
