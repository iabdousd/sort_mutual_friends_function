import * as admin from 'firebase-admin';
import {
  friendsCollectionName,
  mutualFriendsCollectionName,
} from '../constants/firestore';
import { firestore } from './firebase';
import MutualFriends, { Friends } from '../models/mutual_friends';
import UsersServices from './users';

export default class MutualFriendsServices {
  static async getMutualFriendsOfUser(
    userID: string
  ): Promise<MutualFriends | null> {
    const mutualFriendsDocument = await firestore
      .collection(mutualFriendsCollectionName)
      .doc(userID)
      .get();
    if (mutualFriendsDocument.exists && mutualFriendsDocument.data()) {
      return MutualFriends.fromDocumentData(mutualFriendsDocument.data());
    }
    return null;
  }

  static async saveMutualFriends(
    userID: string,
    mutualFriends: MutualFriends,
    merge = false
  ) {
    await firestore
      .collection(mutualFriendsCollectionName)
      .doc(userID)
      .set(mutualFriends.toDocumentData(), { merge: merge });
  }

  static async createMutualFriendsOfUser(
    userID: string
  ): Promise<MutualFriends | null> {
    const userFriendsDocument = await firestore
      .collection(friendsCollectionName)
      .doc(userID)
      .get();

    if (userFriendsDocument.exists && userFriendsDocument.data()) {
      const friends: string[] = Object.entries(userFriendsDocument.data()!)
        .map((e) => e[0])
        .filter((e) => e != userID);

      const friendsFriendsDocuments = await Promise.all(
        friends.map((e) =>
          firestore.collection(friendsCollectionName).doc(e).get()
        )
      );

      const friendsFriends: string[][] = friendsFriendsDocuments.map(
        (friendDocument) =>
          Object.entries(friendDocument.data() as { [x: string]: any })
            .map((e) => e[0])
            .filter((e) => e != friendDocument.id && e != userID)
      );

      const mutualFriendsList: Friends = {};

      friends.forEach((_friend, index) => {
        for (let i = 0; i < friendsFriends[index].length; i++) {
          mutualFriendsList[friendsFriends[index][i]] =
            (mutualFriendsList[friendsFriends[index][i]] ?? 0) + 1;
        }
      });

      const mutualFriends = new MutualFriends(mutualFriendsList);

      await this.saveMutualFriends(userID, mutualFriends);

      return mutualFriends;
    }
    return null;
  }

  static async onNewMutualFriend([friend1ID, friend2ID]: [string, string]) {
    const friend1Friends = await UsersServices.getUserFriendsIds(friend1ID);

    const jobs: Promise<any>[] = [
      ...friend1Friends
        .filter((e) => e != friend2ID)
        .map((e) =>
          firestore
            .collection(mutualFriendsCollectionName)
            .doc(e)
            .update({
              [friend2ID]: admin.firestore.FieldValue.increment(1),
            })
        ),
      ...friend1Friends
        .filter((e) => e != friend2ID)
        .map((e) =>
          firestore
            .collection(mutualFriendsCollectionName)
            .doc(friend2ID)
            .update({
              [e]: admin.firestore.FieldValue.increment(1),
            })
        ),
    ];
    return Promise.all(jobs);
  }

  static async onRemovedMutualFriend([friend1ID, friend2ID]: [string, string]) {
    const friend1Friends = await UsersServices.getUserFriendsIds(friend1ID);

    const jobs: Promise<any>[] = [
      ...friend1Friends
        .filter((e) => e != friend2ID)
        .map((e) =>
          firestore
            .collection(mutualFriendsCollectionName)
            .doc(e)
            .update({
              [friend2ID]: admin.firestore.FieldValue.increment(-1),
            })
        ),
      ...friend1Friends
        .filter((e) => e != friend2ID)
        .map((e) =>
          firestore
            .collection(mutualFriendsCollectionName)
            .doc(friend2ID)
            .update({
              [e]: admin.firestore.FieldValue.increment(-1),
            })
        ),
    ];
    return await Promise.all(jobs);
  }
}
