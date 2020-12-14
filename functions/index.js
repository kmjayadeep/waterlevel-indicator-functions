const functions = require("firebase-functions");
const fetch = require('node-fetch');
const config = require('./config');

// The Firebase Admin SDK to access the Firebase Realtime Database.
// const admin = require("firebase-admin");

const NOTIFY_INTERVAL = 15 * 60 * 1000; //15 mins

exports.notifyWaterlevel = functions.database
  .ref("/waterlevel/measurement")
  .onUpdate(async (snapshot) => {
    // Grab the current value of what was written to the Realtime Database.
    const measurement = snapshot.after.val();
    console.log("measurement", measurement);
    const { percentage } = measurement;

    if(percentage > 20 && percentage < 80) {
      console.log('ignore notification when tank is neither full nor empty');
      return null;
    }

    const notifiedSnap = await snapshot.after.ref.parent.child("notified").get();
    const notified = notifiedSnap.val();

    const type = percentage < 25 ? 'low' : 'high';

    if(notified.type === type && type === 'high') {
      console.log('ignore sending same notification when tank is full')
      return null;
    }

    if(notified.timestamp + NOTIFY_INTERVAL > Date.now()) {
      console.log('ignore notification within the same interval for tank low');
      return null;
    }

    const url = `https://maker.ifttt.com/trigger/${config.iftt.event}/with/key/${config.iftt.key}?value1=${percentage}%`;

    await fetch(url, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
    });

    return snapshot.after.ref.parent.child("notified").set({
      timestamp: Date.now(),
      type
    });
  });
