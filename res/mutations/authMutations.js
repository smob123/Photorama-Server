/**
 * @author Sultan
 * handles user authentication mutations.
 */

const {
    GraphQLNonNull,
    GraphQLString,
    GraphQLBoolean
} = require('graphql');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../modles/userModle');

const {
    UserType
} = require('../dataTypes');

const authMutations =
{
    Signup: {
        type: UserType,
        args: {
            email: { type: GraphQLNonNull(GraphQLString) },
            screenName: { type: GraphQLNonNull(GraphQLString) },
            username: { type: GraphQLNonNull(GraphQLString) },
            password: { type: GraphQLNonNull(GraphQLString) },
            firebaseToken: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { username, email, screenName, password } = args;
            const data = [username, screenName, email, password];

            // check that none of the fields are empty
            data.forEach((item) => {
                if (!item || item.toString().trim() == '') {
                    throw new Error('Please fill in the empty fields');
                }
            });

            // validate the username's pattern
            const usernameRegex = RegExp(/@[a-zA-Z][a-zA-Z0-9\_]{2,8}[a-zA-Z]$/);
            const validUsername = usernameRegex.test(username);

            if (validUsername) {
                throw new Error('Invalid username');
            }

            // validate email address
            const emailRegex =
                RegExp(/[a-zA-Z][a-zA-Z0-9\!\#\$\%\&\'\*\+\-\/\=\?\^\_\`\{\|\}\~]{0,63}\@[a-zA-Z][a-zA-Z0-9-]{0,253}[a-zA-Z0-9]\.[a-z-A-Z]{2,3}/);
            const validEmail = emailRegex.test(email);

            if (!validEmail) {
                throw new Error('Invalid Email');
            }

            // validate password
            if (password.length < 6) {
                throw new Error('Password must be 6 characters at least');
            }

            // check if email address is attached to another acount
            await User.findOne({
                email: args.email.toString().toUpperCase()
            }).then((user) => {
                if (user) {
                    throw new Error('The provided email address is already attached to an account');
                }
            });

            // check if username is already used
            await User.findOne({
                usernameUpCase: args.username.toString().toUpperCase()
            }).then((user) => {
                if (user) {
                    throw new Error('The provided username is already attached to an account');
                }
            });

            // encrypt the password
            const encryptedPassword = await bcrypt.hash(args.password.toString(), 10);
            // create a token to generate a jwt
            const token = (new Buffer.from(args.username, 'utf8')).toString('base64');

            let user = new User({
                email: args.email.toString().toUpperCase(),
                username: args.username.toString(),
                screenName: args.screenName,
                usernameUpCase: args.username.toString().toUpperCase(),
                password: encryptedPassword,
                jwt: jwt.sign(token, 'JWT_SECRET'),
                firebaseToken: args.firebaseToken
            });

            return await user.save();
        }
    },
    Login: {
        type: UserType,
        args: {
            username: { type: GraphQLNonNull(GraphQLString) },
            password: { type: GraphQLNonNull(GraphQLString) },
            firebaseToken: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const data = [args.username, args.password, args.firebaseToken];

            // make sure that none of the fields are empty
            data.forEach((item) => {
                if (!item || item.toString().trim() === '') {
                    throw new Error('Please fill in the empty fields');
                }
            });

            // try to get the user from the database
            const user = await User.findOne({
                usernameUpCase: args.username.toString().toUpperCase()
            });

            if (!user) {
                throw new Error('Invalid credentials');
            }

            // validate the password
            const validPassword = await bcrypt.compare(args.password.toString(), user.password);
            if (!user || !validPassword) {
                throw new Error('Invalid credentials');
            }

            // generate a new jwt token
            user.jwt = jwt.sign({ id: user._id }, 'JWT_SECRET');
            // set the user's status to loggedIn
            user.isLoggedIn = true;
            // store the firebase token
            user.firebaseToken = args.firebaseToken;

            await user.save();

            return user;
        }
    },
    Logout: {
        type: GraphQLBoolean,
        args: {
            userId: { type: GraphQLNonNull(GraphQLString) },
            jwt: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { userId, jwt } = args;

            // try to get the user from the database
            const user = await User.findById(userId);

            if (!user || user.jwt != jwt) {
                throw new Error('Authuntication error');
            }

            // set the user's status to not loggedIn
            user.isLoggedIn = false;
            await user.save();

            return true;
        }
    },
    updateFirebaseToken: {
        type: GraphQLBoolean,
        args: {
            userId: { type: GraphQLNonNull(GraphQLString) },
            jwt: { type: GraphQLNonNull(GraphQLString) },
            firebaseToken: { type: GraphQLNonNull(GraphQLString) }
        },
        resolve: async (parent, args) => {
            const { userId, jwt, firebaseToken } = args;

            // make sure that the token is not empty
            if (firebaseToken.trim() === '') {
                throw new Error('Invalid firebase token');
            }

            // try to get the user from the databse
            const user = await User.findById(userId).catch(err => { throw new Error('Authentication Error'); });

            // validate the user's jwt
            if (user.jwt != jwt) {
                throw new Error('Authentication Error');
            }

            // update the user's firebase token
            user.firebaseToken = firebaseToken;
            await user.save();
        }
    }
};

module.exports = { authMutations };
