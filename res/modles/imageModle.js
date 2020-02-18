/**
 * image's databse modle
 */

const mongoose = require('mongoose');
const schema = mongoose.Schema;

const imageSchema = new schema({
    title: String,
    post: String,
    buffer: String
});

module.exports = mongoose.model('Image', imageSchema);
