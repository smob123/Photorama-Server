/**
 * @author Sultan
 * handles user info related queries.
 */

const {
    GraphQLString,
    GraphQLList,
    GraphQLNonNull
} = require('graphql');

const {
    UserType
} = require('../dataTypes');
const User = require('../modles/userModle');

const userQueries = {
    getUserById: {
        type: UserType,
        args: {
            id: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { id } = args;
            let user = {};

            // look for the user
            await User.findOne({ _id: id }).then(async u => {
                if (!u) {
                    throw new Error('User not found');
                }
                // only store the user's public information
                user = {
                    id: u._id,
                    username: u.username,
                    screenName: u.screenName,
                    posts: u.posts,
                    likes: u.likes,
                    following: u.following,
                    followers: u.followers
                };

                if (u.avatar) {
                    user.avatar = `/images/${u.avatar}`;
                } else {
                    user.avatar = u.avatar;
                }
            });

            return user;
        }
    },
    getUserByName: {
        type: UserType,
        args: {
            username: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { username } = args;
            let user = {};

            // look for the user
            await User.findOne({ usernameUpCase: username.toUpperCase() }).then(async u => {
                if (!u) {
                    throw new Error('User not found');
                }

                // only store the user's public information
                user = {
                    id: u._id,
                    username: u.username,
                    screenName: u.screenName,
                    posts: u.posts,
                    likes: u.likes,
                    following: u.following,
                    followers: u.followers
                };

                if (u.avatar) {
                    user.avatar = `/images/${u.avatar}`;
                } else {
                    user.avatar = u.avatar;
                }
            });

            return user;
        }
    },
    getUsersByIds: {
        type: GraphQLList(UserType),
        args: {
            userIds: { type: GraphQLList(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { userIds } = args;
            // look for the users
            const users = await User.find().where('_id').in(userIds);

            const userList = [];

            // only store the users' public information
            for (const u of users) {
                let user = {
                    id: u._id,
                    username: u.username,
                    screenName: u.screenName,
                    posts: u.posts,
                    likes: u.likes,
                    following: u.following,
                    followers: u.followers
                };

                if (u.avatar) {
                    user.avatar = `/images/${u.avatar}`;
                } else {
                    user.avatar = u.avatar;
                }

                userList.push(user);
            }

            return userList;
        }
    }
};

module.exports = { userQueries };
