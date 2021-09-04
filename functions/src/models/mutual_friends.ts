export type Friends = { [key: string]: number }

export default class MutualFriends {
  friends: Friends

  constructor(friends: Friends) {
    this.friends = friends
  }

  static fromDocumentData(data: any) {
    const friends: Friends = {}

    Object.entries(data).forEach((e) => {
      friends[e[0]] = e[1] as number
    })

    return new MutualFriends(friends)
  }

  toDocumentData(): Friends {
    return this.friends
  }
}
