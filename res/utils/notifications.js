/**
 * @author Sultan
 * handles sending notifications to users' devices.
 */

let admin = require("firebase-admin");

class Notifications {
    /**
     * sends notification to a user's device
     * @param {String} deviceToken the device's firebase token
     * @param {String} title the title of the notification
     * @param {String} body the body of the notification
     * @param {JSON} details detilas explaining what the notification is about
     */
    sendToDevice(deviceToken, title, body, details) {
        // send the notification as data, so that the device will notify the user
        // even if the app is not launched
        const payload = {
            data: {
                title,
                body,
                details: JSON.stringify(details)
            },
            token: deviceToken
        };

        admin.messaging().send(payload).then(res => { })
            .catch(err => {
                console.log(err);
            });
    }
}

module.exports = Notifications;
