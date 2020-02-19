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

mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
// make sure that the connection has been established
mongoose.connection.once(('open'), () => {
    console.log('connected to the database!');
});

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

// host images
const Image = require('./res/modles/imageModle');
const Avatar = require('./res/modles/avatarModle');
app.use('/images', async (req, res, next) => {
    // get the image's id from the url's path
    const imageId = req.path.substr(1, req.path.length - 1);
    // look for the image in post images, and avatars
    const postImage = await Image.findOne({ _id: imageId });
    let image;
    // check if the image was found
    if (postImage) {
        image = postImage;
    } else {
        // otherwise look for it in the avatars modle
        const avatarImage = await Avatar.findOne({ _id: imageId });
        image = postImage || avatarImage;
    }

    // return the image if it's found
    if (image) {
        const imageBuffer = Buffer.from(image.buffer, 'base64');
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': imageBuffer.length
        });
        res.end(imageBuffer);
    }
});

app.use('/graphql', expressGraphQL({
    schema: schema,
    graphiql: true
}));

app.listen(PORT);

console.log(`listening on http://localhost:${PORT}/graphql`);
