import { friendsCollectionName } from '../constants/firestore';
import { firestore } from './firebase';

export default class UsersServices {
  static async getAllUsersIds(): Promise<string[]> {
    const friends = await firestore.collection(friendsCollectionName).get();
    return friends.docs.map((e) => e.id);
  }

  static async getUserFriendsIds(userID: string): Promise<string[]> {
    const friendsDocument = await firestore
      .collection(friendsCollectionName)
      .doc(userID)
      .get();
    return Object.entries(friendsDocument.data() ?? {})
      .map((e) => e[0])
      .filter((e) => e != userID);
  }
}
