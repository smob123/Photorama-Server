/**
 * @author Sultan
 * handles image hosting after the server gets deployed
 */

const request = require('request');

/**
 * sends a host image request to the /host_image endpoint.
 * @param {String} imageId the ID of the image
 * @param {String} base64Image the image as a base64 string
 */
hostImageRequest = (imageId, base64Image) => {
    // check that the parameters are strings
    if (typeof base64Image != 'string' || typeof imageId != 'string') {
        return;
    }

    // put them in an object, and post it to the endpoint
    const obj = JSON.stringify({ id: imageId, buffer: base64Image });

    request.post({
        headers: { 'content-type': 'application/json' },
        url: 'http://localhost:8080/host_image',
        body: obj
    }, (err, res, body) => {
        if (err) {
            console.log(err);
        }
    });
}

/**
 * sends an unhost image request to the /unhost_image endpoint.
 * @param {String} imageId the ID of the image
 */
unhostImageRequest = (imageId) => {
    // check that the parameter is a string
    if (typeof imageId != 'string') {
        return;
    }

    // put it in an object, and post it to the endpoint
    const obj = JSON.stringify({ id: imageId });

    request.post({
        headers: { 'content-type': 'application/json' },
        url: 'http://localhost:8080/unhost_image',
        body: obj
    }, (err, res, body) => {
        if (err) {
            console.log(err);
        }
    });
}

module.exports = {
    hostImageRequest,
    unhostImageRequest
}
