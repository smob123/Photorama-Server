const mongoose = require('mongoose');
const schema = mongoose.Schema;

const userSchema = new schema({
    email: { type: String, unique: true },
    username: { type: String, unique: true },
    usernameUpCase: { type: String, unique: true },
    screenName: String,
    password: String,
    isLoggedIn: { type: Boolean, default: true },
    jwt: String,
    firebaseToken: String,
    avatar: String,
    posts: [String],
    likes: [String],
    comments: [String],
    notifications: [String],
    following: [String],
    followers: [String],
    timeline: [String],
    recommendedHashtags: [String],
    recommendedPosts: [String]
});

module.exports = mongoose.model('User', userSchema);
