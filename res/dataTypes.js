/**
 * @author Sultan
 * GraphQL object types
 */

const {
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLString,
    GraphQLList,
    GraphQLInt
} = require('graphql');

const imageType = new GraphQLObjectType({
    name: 'Image',
    fields: () => ({
        id: { type: GraphQLString },
        title: { type: GraphQLNonNull(GraphQLString) },
        buffer: { type: GraphQLNonNull(GraphQLString) }
    })
});

const postType = new GraphQLObjectType({
    name: 'Post',
    fields: () => ({
        id: { type: GraphQLString },
        userId: { type: GraphQLNonNull(GraphQLString) },
        username: { type: GraphQLNonNull(GraphQLString) },
        userScreenName: { type: GraphQLNonNull(GraphQLString) },
        userAvatar: { type: GraphQLNonNull(GraphQLString) },
        image: { type: GraphQLNonNull(GraphQLString) },
        datetime: { type: GraphQLNonNull(GraphQLString) },
        description: { type: GraphQLString },
        likes: { type: GraphQLList(GraphQLString) },
        comments: { type: GraphQLList(GraphQLString) }
    })
});

const commentType = new GraphQLObjectType({
    name: 'Comment',
    fields: () => ({
        id: { type: GraphQLString },
        postId: { type: GraphQLString },
        userId: { type: GraphQLString },
        username: { type: GraphQLString },
        userAvatar: { type: GraphQLString },
        userScreenName: { type: GraphQLString },
        comment: { type: GraphQLString },
        datetime: { type: GraphQLString }
    })
});

const UserType = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
        id: { type: GraphQLString },
        email: { type: GraphQLString },
        username: { type: GraphQLString },
        screenName: { type: GraphQLString },
        password: { type: GraphQLString },
        jwt: { type: GraphQLString },
        avatar: { type: GraphQLString },
        posts: { type: GraphQLList(GraphQLString) },
        likes: { type: GraphQLList(GraphQLString) },
        following: { type: GraphQLList(GraphQLString) },
        followers: { type: GraphQLList(GraphQLString) }
    })
});

const hashtagType = new GraphQLObjectType({
    name: 'Hashtag',
    fields: () => ({
        id: { type: GraphQLString },
        hashtag: { type: GraphQLString },
        numberOfPosts: { type: GraphQLInt }
    })
});

const postNotificationType = new GraphQLObjectType({
    name: 'Notification',
    fields: () => ({
        id: { type: GraphQLString },
        postId: { type: GraphQLString },
        followerName: { type: GraphQLString },
        message: { type: GraphQLString },
        userAvatar: { type: GraphQLString },
        postImage: { type: GraphQLString },
        datetime: { type: GraphQLString }
    })
});

module.exports = {
    imageType,
    postType,
    commentType,
    UserType,
    hashtagType,
    postNotificationType
};
