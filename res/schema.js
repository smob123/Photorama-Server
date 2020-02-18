/**
 * @author Sultan
 * the server's schema
 */

const {
    GraphQLObjectType,
    GraphQLSchema
} = require('graphql');

const { authMutations } = require('./mutations/authMutations');
const { mediaMutations } = require('./mutations/mediaMutations');
const { userMutations } = require('./mutations/userMutations');

// the mutations schema
const mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        ...authMutations,
        ...mediaMutations,
        ...userMutations
    }
});

const { userQueries } = require('./queries/userQueries');
const { mediaQueries } = require('./queries/mediaQueries');
const { searchQueries } = require('./queries/searchQueries');
const { notificationQueries } = require('./queries/notificationQueries');

// the quiries schema
const RootQuery = new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
        ...userQueries,
        ...mediaQueries,
        ...searchQueries,
        ...notificationQueries
    }
});

module.exports = new GraphQLSchema({
    query: RootQuery,
    mutation: mutation
});
