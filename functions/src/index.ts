import * as functions from 'firebase-functions';
import { friendsCollectionName } from './constants/firestore';
import MutualFriends from './models/mutual_friends';
import MutualFriendsServices from './services/mutual_friends';
import UsersServices from './services/users';
import * as express from 'express';
import * as cors from 'cors';

export const onFriendsUpdated = functions.firestore
  .document(`${friendsCollectionName}/{docID}`)
  .onUpdate(async (snapshot) => {
    const userID = snapshot.after.id;

    const mutualFriends: MutualFriends | null =
      await MutualFriendsServices.getMutualFriendsOfUser(userID);

    if (mutualFriends == null) {
      return Promise.reject("User doesn't have friends!");
    }

    const oldFriends: string[] = Object.entries(snapshot.before.data()).map(
      (e) => e[0]
    );
    const newFriends: string[] = Object.entries(snapshot.after.data()).map(
      (e) => e[0]
    );

    if (oldFriends.length == newFriends.length) {
      // Update doesn't changes the friends list
      // Meaning no need to do any action

      return Promise.resolve();
    } else if (oldFriends.length < newFriends.length) {
      // There's new friend(s)

      const newAddedFriends = newFriends.filter((e) => !oldFriends.includes(e));

      return Promise.all(
        newAddedFriends.map((e) =>
          MutualFriendsServices.onNewMutualFriend([userID, e])
        )
      );
    } else if (oldFriends.length > newFriends.length) {
      // A/Some friend(s) is/are removed

      const removedFriends = oldFriends.filter((e) => !newFriends.includes(e));

      return Promise.all(
        removedFriends.map((e) =>
          MutualFriendsServices.onRemovedMutualFriend([userID, e])
        )
      );
    }
  });

//
// -----------
// Express REST API

const expressApp = express();

expressApp.use(cors({ origin: true }));

expressApp.post('/generate-mutual-friends', async (req, res) => {
  const users = await UsersServices.getAllUsersIds();
  Promise.all(
    users.map((user) => MutualFriendsServices.createMutualFriendsOfUser(user))
  )
    .then((_) => res.send({ success: true }))
    .catch((err) =>
      res.send({
        success: false,
        error: err,
      })
    );
});

export const restApi = functions.https.onRequest(expressApp);
