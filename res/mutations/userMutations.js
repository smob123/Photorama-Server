/**
 * @author Sultan
 * handles mutations related to user accounts.
 */

const {
    GraphQLBoolean,
    GraphQLNonNull,
    GraphQLString
} = require('graphql');

const User = require('../modles/userModle');
const Post = require('../modles/postModle');
const Notification = require('../modles/followerNotificationModle');

const notificationUtils = require('../utils/notifications');
const notifications = new notificationUtils();

const ArrayUtils = require('../utils/arrayUtils');
const utils = new ArrayUtils();

const userMutations = {
    follow: {
        type: GraphQLBoolean,
        args: {
            userId: { type: GraphQLNonNull(GraphQLString) },
            jwt: { type: GraphQLNonNull(GraphQLString) },
            otherUserId: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { userId, jwt, otherUserId } = args;

            // make sure that the user isn't trying to follow themselves
            if (userId === otherUserId) {
                throw new Error('userId and otherId cannot be the same');
            }

            // try to find the user in the database
            const user = await User.findById(userId);

            if (!user || user.jwt != jwt) {
                throw new Error('Authuntication error');
            }

            // look for the account that the user os trying to follow
            const otherUser = await User.findById(otherUserId);

            if (!otherUser) {
                throw new Error('Other user not found');
            }

            // make sure that the user doesn't already follow the account
            let userIndex = user.following.indexOf(otherUserId);

            if (userIndex > -1) {
                throw new Error('Account is already followed');
            }

            // add the account's id to the user's following list, and add the user's 
            // id the account's  followers list
            user.following.push(otherUserId);
            otherUser.followers.push(userId);

            // update user's timeline
            const timeline = [...user.timeline, ...otherUser.posts];
            const posts = await Post.find().where('_id').in(timeline);

            // sort the posts by date
            utils.quickSortPosts(posts, 0, posts.length - 1);

            // get the sroted post's IDs, and them to the user's timeline
            const postIds = [];

            for (let i = 0; i < posts.length; i++) {
                postIds.unshift(posts[i]._id);
            }

            user.timeline = postIds;

            // add a notification to the other account's notifications list
            // telling them, that the user has followed them
            const date = new Date(Date.now());

            const notification = new Notification({
                userId: otherUserId,
                followerName: user.username,
                message: `${user.screenName} has followed you`,
                datetime: date.toUTCString()
            });

            otherUser.notifications.push(notification._id);

            // check if the other user is logged in
            if (otherUser.isLoggedIn) {
                const userInfo = {
                    userInfo: {
                        username: user.username
                    }
                }

                // send a notification to the followed user
                notifications.sendToDevice(otherUser.firebaseToken, 'Photorama', notification.message, userInfo);
            }

            await notification.save();
            await user.save();
            await otherUser.save();

            return true;
        }
    },
    unfollow: {
        type: GraphQLBoolean,
        args: {
            userId: { type: GraphQLNonNull(GraphQLString) },
            jwt: { type: GraphQLNonNull(GraphQLString) },
            otherUserId: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { userId, jwt, otherUserId } = args;

            // make sure that the user isn't trying to unfollow themselves
            if (userId === otherUserId) {
                throw new Error('userId and otherId cannot be the same');
            }

            // try to find the user in the database
            const user = await User.findById(userId);

            if (!user || user.jwt != jwt) {
                throw new Error('Authuntication error');
            }

            // look for the account that the user os trying to follow
            const otherUser = await User.findById(otherUserId);

            if (!otherUser) {
                throw new Error('Other user not found');
            }

            // make sure that the user follows the account
            let index = user.following.indexOf(otherUserId);

            if (index < 0) {
                return false;
            }

            // remove the account's id from the user's following list
            user.following.splice(index, 1);


            // make sure that the account has the user's id in its followers list
            index = otherUser.followers.indexOf(userId);

            if (index < 0) {
                return false;
            }

            // remove the user's id from the other account's followers list
            otherUser.followers.splice(index, 1);

            const otherPosts = otherUser.posts;

            // remove all the other account's posts from the user's timeline
            for (let i = 0; i < otherPosts.length; i++) {
                const postIndex = user.timeline.indexOf(otherPosts[i]);
                user.timeline.splice(postIndex, 1);
            }

            // remove the notification from that was added earlier from the other user's
            // notifications list
            const notification = await Notification.findOne().where('followerName').equals(user.username);
            const notificationIndex = otherUser.notifications.indexOf(notification._id);
            otherUser.notifications.splice(notificationIndex, 1);

            await notification.remove();
            await user.save();
            await otherUser.save();

            return true;
        }
    }
};

module.exports = { userMutations };
