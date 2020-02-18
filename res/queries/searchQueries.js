/**
 * @author Sultan
 * handles search queries.
 */

const {
    GraphQLNonNull,
    GraphQLString,
    GraphQLList
} = require('graphql');

const User = require('../modles/userModle');
const Hashtag = require('../modles/hashtagModle');

const {
    UserType,
    hashtagType
} = require('../dataTypes');

const searchQueries = {
    searchUsersByName: {
        type: GraphQLList(UserType),
        args: {
            username: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { username } = args;
            // turn the input into a regular expression
            const regex = RegExp(`${username.toUpperCase()}`);

            const userArr = [];

            // look for users that match the pattern
            await User.find({ usernameUpCase: regex }).then(values => {
                values.forEach(v => {
                    // only store the user's public information
                    const user = {
                        id: v._id,
                        username: v.username,
                        screenName: v.screenName,
                        posts: v.posts,
                        likes: v.likes,
                        following: v.following,
                        followers: v.followers
                    };

                    if (v.avatar) {
                        user.avatar = `/images/${v.avatar}`;
                    } else {
                        user.avatar = v.avatar;
                    }

                    userArr.push(user);
                });
            });

            return userArr;
        }
    },
    searchHashtagsByName: {
        type: GraphQLList(hashtagType),
        args: {
            hashtag: { type: GraphQLString }
        },
        resolve: async (parent, args) => {
            const { hashtag } = args;
            // turn the input into a regular expression
            const regex = RegExp(`${hashtag}`);
            const results = [];

            // get all the hashtags that match the regex
            const hashtags = await Hashtag.find({ hashtag: regex });

            // get the hashtag names, and the number of posts in the hashtags
            for (const ht of hashtags) {
                if (ht.postIds && ht.postIds.length > 0) {
                    const hashtag = {
                        id: ht._id,
                        hashtag: ht.hashtag,
                        numberOfPosts: ht.postIds.length
                    };

                    results.push(hashtag);
                }
            }

            return results;
        }
    }
}

module.exports = { searchQueries };
