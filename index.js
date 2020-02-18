/**
 * @author Sultan
 * server's setup.
 */

const express = require('express');
const app = express();
const expressGraphQL = require('express-graphql');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const PORT = process.env.PORT || 8080;

// connect to firebase
let admin = require("firebase-admin");

// try to get the firebae service account key from the environment variable
const envVariable = process.env.SERVICE_ACCOUNT_KEY;
// use the environment variable if it exists otherwise looks in the local files
let serviceAccount = envVariable ? JSON.parse(envVariable) : require("./res/config/serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://travel-app-da345.firebaseio.com"
});

// connect to mongodb
const schema = require('./res/schema');
const url = process.env.URL || require('./res/config/dbConfig');

mongoose.connect(url, { useNewUrlParser: true });

// host images
getImages = async () => {
    const Avatar = require('./res/modles/avatarModle');
    const Image = require('./res/modles/imageModle');

    // get all the images from the database
    const avatars = await Avatar.find({}).lean();
    const images = await Image.find({}).lean();

    const dbImages = [...images, ...avatars];

    for (let i = 0; i < dbImages.length; i++) {
        // convert them into a buffer
        const imageBuffer = new Buffer.from(dbImages[i].buffer, 'base64');

        // create a url ending with the image's id
        const url = `/images/${dbImages[i]._id}`;

        // use the url to host the image
        app.use(url, (req, res, next) => {
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': imageBuffer.length
            });
            res.end(imageBuffer);
        });
    }
}

// make sure that the connection has been established
mongoose.connection.once(('open'), async () => {
    console.log('connected to the database!');
    await getImages();
});

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

// used to host new images after the server has been deployed
app.use('/host_image', (req, res, next) => {
    // get the base64 string from the request's body
    const body = req.body;
    const buffer = Buffer.from(body.buffer, 'base64');

    // create a url ending with the id that's passed in the body
    const url = `/images/${body.id}`;

    // use the url to host the image
    app.use(url, (req, res, next) => {
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': buffer.length
        });
        res.end(buffer);
    });

    res.end();
});

// used to unhost images after the server has been deployed
app.use('/unhost_image', (req, res, next) => {
    // get the image's id
    const imageId = req.body.id;
    // get the routes
    const routes = app._router.stack;

    if (routes) {
        routes.forEach((route, index) => {
            // get the route that contains the image's id, and remove it
            const routeName = route.regexp.toString()
            if (routeName.includes(imageId)) {
                routes.splice(index, 1);
            }
        });
    }

    res.end();
});

app.use('/graphql', expressGraphQL({
    schema: schema,
    graphiql: false
}));

app.listen(PORT);

console.log(`listening on http://localhost:${PORT}/graphql`);
