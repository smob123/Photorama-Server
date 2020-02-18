/**
 * @author Sultan
 * handles media related mutations.
 */

const {
    GraphQLNonNull,
    GraphQLString,
    GraphQLBoolean
} = require('graphql');

const User = require('../modles/userModle');
const Avatar = require('../modles/avatarModle');
const Image = require('../modles/imageModle');
const Post = require('../modles/postModle');
const Comment = require('../modles/commentModle');
const Hashtag = require('../modles/hashtagModle');
const PostNotification = require('../modles/postNotificationModle');
const MentionNotification = require('../modles/mentionNotification');

const notificationUtils = require('../utils/notifications');
const notifications = new notificationUtils();

const {
    UserType,
    postType,
    commentType
} = require('../dataTypes');

const mediaMutations =
{
    uploadAvatar: {
        type: UserType,
        args: {
            id: { type: GraphQLNonNull(GraphQLString) },
            jwt: { type: GraphQLNonNull(GraphQLString) },
            image: { type: GraphQLString },
        },
        resolve: async (parent, args) => {
            const { id, jwt, image } = args;

            // TODO: check if buffer is an actual image

            // looks for user in the database
            const user = await User.findById(id);
            if (!user || user.jwt != jwt) {
                throw new Error('Authuntication error');
            }

            // create a new avatar object, and adds its id to the user object
            const avatar = new Avatar({
                userId: user._id,
                buffer: image
            });

            user.avatar = avatar._id;
            await avatar.save();
            await user.save();

            user.avatar = `/images/${avatar._id}`;

            return user;
        }
    },
    deleteAvatar: {
        type: GraphQLBoolean,
        args: {
            userId: { type: GraphQLNonNull(GraphQLString) },
            jwt: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { userId, jwt } = args;

            // look for the user
            const user = await User.findById(userId).catch(err => { throw new Error('Authuntication error'); });

            // verify the jwt
            if (user.jwt != jwt) {
                throw new Error('Authuntication error');
            }

            // check if user doesn't have an avatar
            if (!user.avatar) {
                throw new Error('User has no Avatar');
            }

            // remove the avatar object that's linked to the user
            const avatarId = user.avatar;
            const avatar = await Avatar.findByIdAndDelete(avatarId);

            // remove the refrence to the avatar
            user.avatar = null;

            await user.save();
            await avatar.save();

            return true;
        }
    },
    uploadPost: {
        type: postType,
        args: {
            userId: { type: GraphQLNonNull(GraphQLString) },
            jwt: { type: GraphQLNonNull(GraphQLString) },
            image: { type: GraphQLNonNull(GraphQLString) },
            description: { type: GraphQLString }
        },
        resolve: async (parent, args) => {
            const { userId, jwt, image, description } = args;

            // look for the user
            const user = await User.findById(userId).catch(err => { throw new Error('Authuntication error'); });

            // verify the jwt
            if (user.jwt != jwt) {
                throw new Error('Authuntication error');
            }

            // TODO check if buffer is an actual image

            const datetime = new Date(Date.now());

            // create an image object
            const img = new Image({
                title: `${args.userId}_${datetime.toUTCString()}`,
                buffer: image
            });


            // create a post object
            const post = new Post({
                userId: args.userId,
                image: img._id,
                datetime: datetime.toUTCString(),
                description: description,
                likes: []
            });

            // stores the IDs for all the hashtags
            const hashtags = [];
            // check if there is a description
            if (description && description.trim() != '') {
                // get the list of hashtags from the description
                const list = description.match(/#\w+/g);

                // if a list of hashtags was returned
                if (list) {
                    // loop through them
                    for (let i = 0; i < list.length; i++) {
                        // find the hashtag at the current index
                        const hashtag = await Hashtag.findOne({ hashtag: list[i] });

                        // check if the hashtag exists in the database
                        if (hashtag) {
                            // add its id to hashtags
                            hashtags.push(hashtag._id);
                            // add the post's id to this hashtag, and save it
                            hashtag.postIds.unshift(post._id);
                            await hashtag.save();
                        } else {
                            // otherwise create a new hashtag
                            const h = new Hashtag({ postIds: [post._id], hashtag: list[i] });
                            await h.save();
                            // add the new hashtag's id
                            hashtags.push(h._id);
                        }
                    }
                    // add the list of hashtags to the post object
                    post.hashtags = hashtags;
                }
            }

            // get all the mentioned users
            const mentions = description.match(/@\w+/g);
            if (mentions) {
                // get the unique usersnames
                const uniqueUsersSet = new Set(mentions);
                const uniqueUsers = Array.from(uniqueUsersSet);

                for (const uniqueUser of uniqueUsers) {
                    // get the username without the @ symbol
                    const username = uniqueUser.substr(1, uniqueUser.length - 1);
                    // look for it in the database
                    const mentionedUser = await User.findOne().where('username').equals(username);

                    // check that the mentioned user exists, and that post's uploader hasn't mentioned themselves
                    if (mentionedUser && (mentionedUser._id.toString() !== user._id.toString())) {
                        // add a new notification to the mentioned user's notifications list
                        const datetime = new Date(Date.now());
                        const mentionNotification = new MentionNotification({
                            userId: user._id,
                            interactorId: user._id,
                            mentionedUserId: mentionedUser._id,
                            postId: post._id,
                            message: `${user.screenName} has mentioned you on their post`,
                            datetime: datetime.toUTCString()
                        });

                        mentionedUser.notifications.unshift(mentionNotification._id);

                        if (mentionedUser.isLoggedIn) {
                            // send a notification to the mentioned user
                            const postInfo = {
                                postInfo: {
                                    postId: post._id
                                }
                            };

                            notifications.sendToDevice(mentionedUser.firebaseToken, 'Photorama', mentionNotification.message, postInfo);
                        }

                        await mentionNotification.save();
                        await mentionedUser.save();
                    }
                }
            }

            // add the new post's id to the image object
            img.post = post._id;
            await img.save();
            await post.save();

            // add the post to the user's timeline, and list of posts
            user.timeline.unshift(post._id);
            user.posts.unshift(post._id);
            await user.save();

            // add the user's screen name to the post object
            post.userScreenName = user.screenName;

            const followers = await User.find().where('_id').in(user.followers);

            // add the post to the user's followers' timeline
            for (const follower of followers) {
                follower.timeline.unshift(post._id);
                follower.save();
            }

            return post;
        }
    },
    deletePost: {
        type: GraphQLBoolean,
        args: {
            userId: { type: GraphQLNonNull(GraphQLString) },
            postId: { type: GraphQLNonNull(GraphQLString) },
            jwt: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { userId, postId, jwt } = args;

            // look for the user
            const user = await User.findById(userId).catch(err => { throw new Error('Authuntication error'); });

            // verify the jwt
            if (user.jwt != jwt) {
                throw new Error('Authuntication error');
            }

            // check if the post is in the user's posts array
            if (!user.posts.includes(postId)) {
                throw new Error('Post not found');
            }

            // remove post from the user's posts list
            let index = user.posts.indexOf(postId);
            user.posts.splice(index, 1);

            // remove the post from the user's timeline
            index = user.timeline.indexOf(postId);
            user.timeline.splice(index, 1);

            // delete the post from the user's followers' timelines
            const followers = await User.find().where('_id').in(user.followers);

            for (const follower of followers) {
                index = follower.timeline.indexOf(postId);
                follower.timeline.splice(index, 1);
                follower.save();
            }

            // get the post from the database
            const post = await Post.findById(postId);

            // remove the post's id from all the hashtags
            const hashtags = await Hashtag.find().where('_id').in(post.hashtags);

            for (const h of hashtags) {
                const postIndex = h.postIds.indexOf(postId);
                h.postIds.splice(postIndex, 1);
                await h.save();
            }

            // remove all the comments
            const comments = await Comment.find().where('_id').in(post.comments);
            for (const comment of comments) {
                const commentUser = await User.findById(comment.userId);
                const commentIndex = commentUser.comments.indexOf(comment._id);
                commentUser.comments.splice(commentIndex, 1);
                await commentUser.save();
                await comment.remove();
            }

            // remove it from the user's likes
            const userIds = await User.find().where('_id').in(post.likes);
            for (const u of userIds) {
                // get the post ID's index in the user's likes list
                const postIndex = u.likes.indexOf(postId);
                // remove it from the list
                u.likes.splice(postIndex, 1);
                await u.save();
            }

            // remove all notifications that are related to the post //

            // get all the post notifications
            const postNotifications = await PostNotification.find().where('postId').equals(post._id);
            // get all the mention notifications
            const mentionNotifications = await MentionNotification.find().where('postId').equals(post._id);
            const notifications = [...postNotifications, ...mentionNotifications];

            for (const notification of notifications) {
                // check if the notification is a mention notification
                if (notification.mentionedUserId) {
                    // remove its refrence from the notified user's notifications list
                    const mentionedUser = await User.findById(notification.mentionedUserId);
                    const notificationIndex = mentionedUser.notifications.indexOf(notification._id);
                    mentionedUser.notifications.splice(notificationIndex, 1);
                    await mentionedUser.save();
                    // remove the notification object
                    await notification.remove();
                    continue;
                }
                // remove its refrence from the notified user's notifications list
                const notifiedUser = await User.findById(notification.userId);
                const notificationIndex = notifiedUser.notifications.indexOf(notification._id);
                notifiedUser.notifications.splice(notificationIndex, 1);
                await notifiedUser.save();
                // remove the notification object
                await notification.remove();
            }

            await user.save();
            // delete the image object that the post refrences
            await Image.findByIdAndDelete(post.image);
            // delet the post object
            await post.remove();

            return true;
        }
    },
    likePost: {
        type: GraphQLBoolean,
        args: {
            userId: { type: GraphQLNonNull(GraphQLString) },
            jwt: { type: GraphQLNonNull(GraphQLString) },
            postId: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { userId, jwt, postId } = args;
            // look for the user
            const user = await User.findById(userId).catch(err => { throw new Error('Authuntication error'); });

            // verify the jwt
            if (user.jwt != jwt) {
                throw new Error('Authuntication error');
            }

            // validate post id
            const post = await Post.findById(postId).catch(err => { throw new Error('Post not found'); });

            // add the user's id to the post's likes, and the post' id to the user's like
            if (!post.likes.includes(user._id)) {
                post.likes.unshift(user._id);
                user.likes.unshift(post._id);

                // check if the post has any hashtags
                if (post.hashtags) {
                    // if the user has a recommended hashtags list
                    if (user.recommendedHashtags && user.recommendedHashtags.length > 0) {
                        // add this post's hashtags to it
                        user.recommendedHashtags.unshift(...post.hashtags);
                    } else {
                        // otherwise set the recommended hashtag list equal to the post's hashtags list
                        user.recommendedHashtags = post.hashtags;
                    }
                }

                if (post.userId.toString() !== user._id.toString()) {
                    // send a notification to the post's uploader
                    const postUploader = await User.findById(post.userId);

                    const datetime = new Date(Date.now());
                    // add new notification to the user's notifications list
                    const postNotification = new PostNotification({
                        userId: post.userId,
                        interactorId: user._id,
                        postId: post._id,
                        message: `${user.screenName} has like your post`,
                        datetime: datetime.toUTCString()
                    });

                    postUploader.notifications.unshift(postNotification._id);

                    await postNotification.save();
                    await postUploader.save();

                    if (postUploader.isLoggedIn) {
                        // send a push notification to the user
                        const postInfo = {
                            postInfo: {
                                postId: post._id
                            }
                        };

                        notifications.sendToDevice(postUploader.firebaseToken, 'Photorama', postNotification.message, postInfo);
                    }
                }

                await post.save();
                await user.save();

                return true;
            }

            return false;
        }
    },
    unlikePost: {
        type: GraphQLBoolean,
        args: {
            userId: { type: GraphQLNonNull(GraphQLString) },
            jwt: { type: GraphQLNonNull(GraphQLString) },
            postId: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { userId, jwt, postId } = args;

            // look for the user
            const user = await User.findById(userId).catch(err => { throw new Error('Authuntication error'); });

            // verify the jwt
            if (user.jwt != jwt) {
                throw new Error('Authuntication error');
            }

            // validate post id
            const post = await Post.findById(postId).catch(err => { throw new Error('Post not found'); });

            // remove the user's id from the post's likes, and the post's id from the user's like
            if (post.likes.includes(user._id)) {
                // remove the user's id from the post's likes list
                const postIndex = post.likes.indexOf(user._id);
                post.likes.splice(postIndex, 1);

                // remove the post's id from the user's likes list
                const postIdIndex = user.likes.indexOf(post._id);
                user.likes.splice(postIdIndex, 1);

                if (post.userId.toString() !== user._id.toString()) {
                    const message = `${user.screenName} has like your post`;

                    // remove notification from the other user's notifications list
                    const postNotification = await PostNotification.findOne({
                        interactorId: user._id,
                        postId: post._id,
                        message
                    });

                    // remove the notification that was sent when the user has liked the post from the uploader's notifications list
                    const postUploader = await User.findById(post.userId);
                    const notificationIndex = postUploader.notifications.indexOf(postNotification._id);
                    postUploader.notifications.splice(notificationIndex, 1);

                    await postNotification.remove();
                    await postUploader.save();
                }

                await post.save();
                await user.save();

                return true;
            }

            return false;
        }
    },
    addComment: {
        type: commentType,
        args: {
            userId: { type: GraphQLNonNull(GraphQLString) },
            jwt: { type: GraphQLNonNull(GraphQLString) },
            postId: { type: GraphQLNonNull(GraphQLString) },
            comment: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { userId, jwt, postId, comment } = args;

            // make sure that the comment isn't empty
            if (comment.trim() === '') {
                return false;
            }

            // look for the user
            const user = await User.findById(userId).catch(err => { throw new Error('Authuntication error'); });

            // verify the jwt
            if (user.jwt != jwt) {
                throw new Error('Authuntication error');
            }

            // validate post id
            const post = await Post.findById(args.postId).catch(err => { throw new Error('Post not found'); });

            // create a new comment object
            const datetime = new Date(Date.now());

            const c = new Comment({
                userId,
                postId,
                comment,
                datetime: datetime.toUTCString()
            });

            // add the comment's id to the user's, and post's comments lists
            user.comments.unshift(c._id);
            post.comments.unshift(c._id);

            // send a notification to all the users that were mentioned in the comment
            const mentions = comment.match(/@\w+/g);
            if (mentions) {
                // get the unique values
                const uniqueUsersSet = new Set(mentions);
                const uniqueUsers = Array.from(uniqueUsersSet);

                for (const uniqueUser of uniqueUsers) {
                    // get the username without the @ symbol, and look for the user
                    const username = uniqueUser.substr(1, uniqueUser.length - 1);
                    const mentionedUser = await User.findOne().where('username').equals(username);

                    // check that:
                    // - the user mentioned user exists 
                    // - the user didn't mention themselves
                    // - the user didn't mention the post's uploader (because another notification will be sent to them later)
                    if (mentionedUser && mentionedUser._id !== user._id &&
                        mentionedUser._id.toString() !== post.userId.toString()) {
                        // create a notification object
                        const datetime = new Date(Date.now());
                        const mentionNotification = new MentionNotification({
                            userId: post.userId,
                            interactorId: user._id,
                            mentionedUserId: mentionedUser._id,
                            postId: post._id,
                            message: `${user.screenName} has mentioned you in a comment`,
                            datetime: datetime.toUTCString()
                        });

                        // add it to the mentioned user's notifications list
                        mentionedUser.notifications.unshift(mentionNotification._id);

                        if (mentionedUser.isLoggedIn) {
                            // send a push notification to the mentioned user
                            const postInfo = {
                                postInfo: {
                                    postId: post._id
                                }
                            };

                            notifications.sendToDevice(mentionedUser.firebaseToken, 'Photorama', mentionNotification.message, postInfo);
                        }

                        await mentionNotification.save();
                        await mentionedUser.save();
                    }
                }
            }

            if (post.userId.toString() !== user._id.toString()) {
                const postUploader = await User.findById(post.userId);

                // add new notification to the post uploader's notifications list
                const postNotification = new PostNotification({
                    userId: post.userId,
                    interactorId: user._id,
                    commentId: c._id,
                    postId: post._id,
                    message: `${user.screenName} has commented on your post`,
                    datetime: datetime.toUTCString()
                });

                postUploader.notifications.unshift(postNotification._id);

                await postNotification.save();
                await postUploader.save();

                if (postUploader.isLoggedIn) {
                    // send a push notificaion to the post's uploader
                    const postInfo = {
                        postInfo: {
                            postId: post._id
                        }
                    };

                    notifications.sendToDevice(postUploader.firebaseToken, 'Photorama', postNotification.message, postInfo);
                }
            }

            await c.save();
            await user.save();
            await post.save();

            // add more data to match the database schema, and return the comment object
            c.username = user.username;
            c.userAvatar = `/images/${user.avatar}`;
            c.userScreenName = user.screenName;

            return c;
        }
    },
    deleteComment: {
        type: GraphQLBoolean,
        args: {
            userId: { type: GraphQLNonNull(GraphQLString) },
            jwt: { type: GraphQLNonNull(GraphQLString) },
            commentId: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { userId, jwt, commentId } = args;

            // look for the user
            const user = await User.findById(userId).catch(err => { throw new Error('Authuntication error'); });

            // verify the jwt
            if (user.jwt != jwt) {
                throw new Error('Authuntication error');
            }

            // validate comment id
            const comment = await Comment.findById(commentId).catch(err => { throw new Error('Comment not found'); })

            // check if the user id that is linked to the comment is the same as
            // the requester's id
            if (comment.userId != userId) {
                return false;
            }

            // get the post that has the comment
            const post = await Post.findById(comment.postId);

            if (!post.comments) {
                return false;
            }

            // get the index of the comment, and remove it from the list
            const commentIndex = post.comments.indexOf(comment._id);
            post.comments.splice(commentIndex, 1);

            // remove the comment from the user's comment list
            const i = user.comments.indexOf(comment._id);
            user.comments.splice(i, 1);

            // remove notifications from the mentioned users in the comment
            const mentions = comment.comment.match(/@\w+/g);
            if (mentions && mentions.length > 0) {
                // get the unique users
                const uniqueUsersSet = new Set(mentions);
                const uniqueUsers = Array.from(uniqueUsersSet);

                for (const uniqueUser of uniqueUsers) {
                    // get the username without the @ symbol
                    const username = uniqueUser.substr(1, uniqueUser.length - 1);
                    // look for the user in the database
                    const mentionedUser = await User.findOne().where('username').equals(username);
                    if (mentionedUser) {
                        // look for the mention notification
                        const mentionNotification = await MentionNotification.findOne({
                            commentId
                        });

                        // check that the mention notification exists
                        if (mentionNotification) {
                            // get the index of its refrence in the mentioned user's notifications list
                            const notificationIndex = mentionedUser.notifications.indexOf(mentionNotification._id);
                            // remove it
                            mentionedUser.notifications.splice(notificationIndex, 1);
                            await mentionedUser.save();
                            // remove the notification
                            await mentionNotification.remove();
                        }
                    }
                }
            }

            // check if the commenter's id isn't the same as the post uploader's id
            if (post.userId.toString() !== user._id.toString()) {
                // remove notification from the other user's notifications list
                const postNotification = await PostNotification.findOne({
                    commentId
                });

                const postUploader = await User.findById(post.userId);
                const notificationIndex = postUploader.notifications.indexOf(postNotification._id);
                postUploader.notifications.splice(notificationIndex, 1);

                await postNotification.remove();
                await postUploader.save();
            }

            // save the changes
            await comment.remove();
            await post.save();
            await user.save();

            return true;
        }
    }
};

module.exports = { mediaMutations };
