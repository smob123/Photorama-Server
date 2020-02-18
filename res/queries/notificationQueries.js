/**
 * @author Sultan
 * handles sending notification related queries.
 */

const {
    GraphQLNonNull,
    GraphQLString,
    GraphQLInt,
    GraphQLList
} = require('graphql');

const { postNotificationType } = require('../dataTypes');

const User = require('../modles/userModle');
const Post = require('../modles/postModle');
const PostNotification = require('../modles/postNotificationModle');
const FollowerNotification = require('../modles/followerNotificationModle');
const MentionNotification = require('../modles/mentionNotification');


const notificationQueries = {
    getUserNotifications: {
        type: GraphQLList(postNotificationType),
        args: {
            userId: { type: GraphQLNonNull(GraphQLString) },
            jwt: { type: GraphQLNonNull(GraphQLString) },
            startIndex: { type: GraphQLNonNull(GraphQLInt) },
            endIndex: { type: GraphQLNonNull(GraphQLInt) }
        },
        resolve: async (parent, args) => {
            const { userId, jwt, startIndex, endIndex } = args;

            // validate the start, and end indexes
            if (startIndex < 0 || endIndex < 0 || startIndex > endIndex) {
                throw new Error('invalid range');
            }

            // get the user from the databse
            const user = await User.findById(userId).catch(err => { throw new Error('Authuntication error'); });

            // make sure that the start index is smaller than the length of the user's notifications list
            if (startIndex > user.notifications.length) {
                return [];
            }

            // validate the jwt
            if (user.jwt != jwt) {
                throw new Error('Authuntication error');
            }

            const notifications = [];
            userNotifications = user.notifications;

            // go through the notifications based on the indexes
            for (let i = startIndex; i < endIndex; i++) {
                if (i >= userNotifications.length) {
                    break;
                }

                const notificationId = userNotifications[i];
                // try to get the notification from the post notifications
                let notification = await PostNotification.findOne({ _id: notificationId });

                if (notification) {
                    const user = await User.findById(notification.interactorId);
                    const post = await Post.findById(notification.postId);
                    if (user.avatar) {
                        notification.userAvatar = `/images/${user.avatar}`;
                    }
                    notification.postImage = `/images/${post.image}`;

                    notifications.unshift(notification);

                    continue;
                }

                // if it doesn't exist look for it in the mention notifications
                notification = await MentionNotification.findOne({ _id: notificationId });
                if (notification) {
                    const user = await User.findById(notification.interactorId);
                    const post = await Post.findById(notification.postId);
                    if (user.avatar) {
                        notification.userAvatar = `/images/${user.avatar}`;
                    }
                    notification.postImage = `/images/${post.image}`;
                    notifications.unshift(notification);
                    continue;
                }

                // if it doesn't exist then it must be in the follower notifications
                notification = await FollowerNotification.findOne({ _id: notificationId });

                if (notification) {
                    const follower = await User.findOne({ username: notification.followerName });
                    notification.userAvatar = `/images/${follower.avatar}`;
                    notifications.unshift(notification);
                    continue;
                }
            }

            return notifications;
        }
    }
}

module.exports = { notificationQueries };
