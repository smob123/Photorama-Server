/**
 * @author Sultan
 * handles media related queries.
 */

const {
    GraphQLNonNull,
    GraphQLList,
    GraphQLString,
    GraphQLInt
} = require('graphql');

const User = require('../modles/userModle');
const Post = require('../modles/postModle');
const Comment = require('../modles/commentModle');
const Hashtag = require('../modles/hashtagModle');

const {
    postType,
    commentType
} = require('../dataTypes');

const PostRecomendations = require('../utils/postRecomendations');
const recomendations = new PostRecomendations();

const mediaQueries = {
    getUserPosts: {
        type: GraphQLList(postType),
        args: {
            username: {
                type: GraphQLNonNull(GraphQLString)
            },
            startIndex: {
                type: GraphQLNonNull(GraphQLInt)
            },
            endIndex: {
                type: GraphQLNonNull(GraphQLInt)
            }
        },
        resolve: async (parent, args) => {
            const {
                username,
                startIndex,
                endIndex
            } = args;

            // validate the indexes
            if (startIndex < 0 || endIndex < 0 || startIndex > endIndex) {
                throw new Error('Invalid range');
            }

            // look for the user in the database
            const user = await User.findOne({
                usernameUpCase: username.toUpperCase()
            });

            if (!user) {
                throw new Error('User not found');
            }

            const postIds = user.posts;
            const numOfPosts = endIndex - startIndex;
            // look for posts within the given range
            const postList = await Post.find().where('_id').in(postIds).sort([
                ['datetime', -1]
            ]).skip(startIndex).limit(numOfPosts);

            const posts = [];
            // add extra information to match the server's schema
            for (const post of postList) {
                const p = {
                    ...post._doc
                };
                delete p['_id'];
                p.id = post._id;
                const image = `/images/${post.image}`;
                p.datetime = new Date(post.datetime).toUTCString();
                p.image = image;
                p.username = user.username;
                p.userScreenName = user.screenName;

                posts.push(p);
            }

            return posts;
        }
    },
    getPostById: {
        type: postType,
        args: {
            postId: {
                type: GraphQLNonNull(GraphQLString)
            }
        },
        resolve: async (parent, args) => {
            // look for post in the database
            const post = await Post.findById(args.postId).catch(err => {
                throw new Error('Post not found');
            });


            // add extra information to match the server's schema
            const p = {
                ...post._doc
            };
            delete p['_id'];
            p.id = post._id;
            const image = `/images/${post.image}`;
            p.image = image;
            p.datetime = new Date(post.datetime).toUTCString();
            const user = await User.findById(p.userId);
            p.username = user.username;
            p.userScreenName = user.screenName;
            p.userAvatar = `/images/${user.avatar}`;

            return p;
        }
    },
    getPostComments: {
        type: GraphQLList(commentType),
        args: {
            postId: {
                type: GraphQLNonNull(GraphQLString)
            },
            startIndex: {
                type: GraphQLNonNull(GraphQLInt)
            },
            endIndex: {
                type: GraphQLNonNull(GraphQLInt)
            }
        },
        resolve: async (parent, args) => {
            const {
                postId,
                startIndex,
                endIndex
            } = args;

            // validate indexes
            if (startIndex < 0 || endIndex < 0 || startIndex > endIndex) {
                throw new Error('Invalid range');
            }

            // look for post in the database
            const post = await Post.findById(postId).catch(err => {
                throw new Error('Post not found');
            });

            // get the number of comments that's required
            const numOfComments = endIndex - startIndex;

            // get the list of comments
            const commentsList = await Comment.find().where('_id').in(post.comments).skip(startIndex).limit(numOfComments);
            const comments = [];

            // find each commenter's information, and store it to match the server's schema
            for (const comment of commentsList) {
                const user = await User.findById(comment.userId);
                comment.username = user.username
                comment.userScreenName = user.screenName;

                if (user.avatar) {
                    comment.userAvatar = `/images/${user.avatar}`;
                }
                comments.unshift(comment);
            }

            return comments;
        }
    },
    getUserTimeline: {
        type: GraphQLList(postType),
        args: {
            userId: {
                type: GraphQLNonNull(GraphQLString)
            },
            jwt: {
                type: GraphQLNonNull(GraphQLString)
            },
            startIndex: {
                type: GraphQLNonNull(GraphQLInt)
            },
            endIndex: {
                type: GraphQLNonNull(GraphQLInt)
            }
        },
        resolve: async (parent, args) => {
            const {
                userId,
                jwt,
                startIndex,
                endIndex
            } = args;

            // validate the indexes
            if (startIndex < 0 || endIndex < 0 || startIndex > endIndex) {
                throw new Error('Invalid range');
            }

            // look for user in the database
            const user = await User.findById(userId).catch(err => {
                throw new Error('Authentication Error');
            });

            // validate the jwt
            if (user.jwt != jwt) {
                throw new Error('Authentication Error');
            }

            // validate the start index
            if (startIndex > user.timeline.length) {
                return [];
            }

            // get the requested number of post IDs
            const timeline = user.timeline.slice(startIndex, endIndex);

            // look for them in the database
            const postList = await Post.find({
                '_id': {
                    $in: timeline
                }
            });

            const posts = [];

            // add extra data to match the server's schema
            for (const post of postList) {
                const p = {
                    ...post._doc
                };
                p.id = post._id;
                const image = `/images/${post.image}`;
                p.datetime = new Date(post.datetime).toUTCString();
                p.image = image;
                const u = await User.findById(post.userId);
                p.username = u.username;
                p.userScreenName = u.screenName;
                if (u.avatar) {
                    p.userAvatar = `/images/${u.avatar}`;
                } else {
                    p.userAvatar = 'null';
                }

                posts.unshift(p);
            }

            return posts;
        }
    },
    getPostRecommendations: {
        type: GraphQLList(postType),
        args: {
            userId: {
                type: GraphQLNonNull(GraphQLString)
            },
            jwt: {
                type: GraphQLNonNull(GraphQLString)
            },
            startIndex: {
                type: GraphQLNonNull(GraphQLInt)
            },
            endIndex: {
                type: GraphQLNonNull(GraphQLInt)
            }
        },
        resolve: async (parent, args) => {
            const {
                userId,
                jwt,
                startIndex,
                endIndex
            } = args;

            // validate the indexes
            if (startIndex < 0 || endIndex < 0 || startIndex > endIndex) {
                throw new Error('Invalid range');
            }

            const user = await User.findById(userId).catch(err => {
                throw new Error('User not found');
            });

            // reset the user's recommended posts if the start index is 0
            if (startIndex === 0) {
                user.recommendedPosts = [];
            }

            // validate the jwt
            if (user.jwt != jwt) {
                throw new Error('Authentication Error');
            }

            // get the number of posts
            const numOfPosts = endIndex - startIndex;

            // get the user's recommended hashtags
            const hashtags = user.recommendedHashtags;

            // post objects that will be returned
            const posts = [];
            // the IDs of the posts that were fetch from the database, which will
            // be stored in the user's recommended posts list, in order to not send the same
            // posts when the user sends another request with a different range
            let postIds = [];

            // check if the user has any recommended hashtags
            if (hashtags && hashtags.length > 0) {
                // shuffle the hashtags' IDs
                recomendations.shuffle(hashtags);
                // shuffle the post IDs in the hashtags
                postIds = await recomendations.getShuffledHashtagPosts(hashtags);

                // look for posts that haven't been sent to the user, and limit them to the requested number of posts
                const postList = await Post.find()
                    .where('_id').in(postIds).where('_id').nin(user.recommendedPosts).limit(numOfPosts);

                // add extra data to match the server's schema
                for (post of postList) {
                    const p = {
                        ...post._doc
                    };
                    delete p['_id'];
                    p.id = post._id;
                    const image = `/images/${post.image}`;
                    p.datetime = new Date(post.datetime).toUTCString();
                    p.image = image;
                    const u = await User.findById(post.userId);
                    p.username = u.username;
                    p.userScreenName = u.screenName;
                    if (u.avatar) {
                        p.userAvatar = `/images/${u.avatar}`;
                    } else {
                        p.userAvatar = 'null';
                    }

                    posts.push(p);
                    postIds.push(p.id);
                }

                // check if start index is 0
                if (startIndex === 0) {
                    // set the user's recommendations to the random posts
                    user.recommendedPosts = postIds;
                } else {
                    // otherwise add the new random posts to the user's recommendations
                    user.recommendedPosts.push(...postIds);
                }

                // check if the number of required posts has been reached
                if (posts.length === numOfPosts) {
                    user.save();
                    return posts;
                }
            }

            const postRecomendations = [];

            // the number of remaining posts
            const remainingSpace = numOfPosts - posts.length;

            // get random posts, which are unrelated to the user
            const randomPosts = await Post.where('userId').ne(user._id)
                .where('_id').nin(postIds).where('_id').nin(user.recommendedPosts)
                .limit(remainingSpace);
            // shuffle them
            recomendations.shuffle(randomPosts);

            // add them to the user's recommended posts
            for (post of randomPosts) {
                user.recommendedPosts.push(post._id);
                postRecomendations.unshift(post);
            }

            await user.save();

            // add extra data to match the server's schema
            for (const post of postRecomendations) {
                const p = {
                    ...post._doc
                };
                delete p['_id'];
                p.id = post._id;
                const image = `/images/${post.image}`;
                p.datetime = new Date(post.datetime).toUTCString();
                p.image = image;
                const u = await User.findById(post.userId);
                p.username = u.username;
                p.userScreenName = u.screenName;
                if (u.avatar) {
                    p.userAvatar = `/images/${u.avatar}`;
                } else {
                    p.userAvatar = 'null';
                }

                posts.push(p);
            }

            return posts;
        }
    },
    getPostsByHashtag: {
        type: GraphQLList(postType),
        args: {
            hashtag: {
                type: GraphQLString
            }
        },
        resolve: async (parent, args) => {
            const {
                hashtag
            } = args;

            // look for the hashtag in the database
            const ht = await Hashtag.findOne({
                hashtag
            });

            if (!ht) {
                throw new Error('Hashtag not found');
            }

            // the list of posts to return to the user
            const posts = [];

            // look for the hashtag's posts
            const postsList = await Post.find().where('_id').in(ht.postIds);

            // add user, and post data to the list
            for (const post of postsList) {
                const user = await User.findById(post.userId);

                const p = {
                    ...post._doc
                };
                delete p['_id'];
                p.id = post._id;
                const image = `/images/${post.image}`;
                p.datetime = new Date(post.datetime).toUTCString();
                p.image = image;
                const u = await User.findById(post.userId);
                p.username = u.username;
                p.userScreenName = u.screenName;
                if (u.avatar) {
                    p.userAvatar = `/images/${u.avatar}`;
                } else {
                    p.userAvatar = 'null';
                }

                posts.push(p);
            }

            return posts;
        }
    }
};

module.exports = {
    mediaQueries
};