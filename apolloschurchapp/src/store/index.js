import gql from 'graphql-tag';
import AsyncStorage from '@react-native-community/async-storage';
import { schema as mediaPlayerSchema } from '@apollosproject/ui-media-player';
import { updatePushId } from '@apollosproject/ui-notifications';
import CACHE_LOADED from '../client/getCacheLoaded'; // eslint-disable-line

// TODO: this will require more organization...ie...not keeping everything in one file.
// But this is simple while our needs our small.

export const schema = `
  type Query {
    devicePushId: String
    cacheLoaded: Boolean
    notificationsEnabled: Boolean
  }

  type Mutation {
    cacheMarkLoaded: Boolean
    updateDevicePushId(pushId: String!): String
    updatePushPermissions(enabled: Boolean!): Boolean

    markNotificationRead(id: ID!): Boolean
  }

  extend type NotificationHistory {
    read: Int!
  }

  extend type Notification {
    read: Boolean
  }
${mediaPlayerSchema || ''}
`;

export const defaults = {
  __typename: 'Query',
  cacheLoaded: false,
};

const GET_LOGGED_IN = gql`
  query {
    isLoggedIn @client
  }
`;

export const GET_ALL_DATA = gql`
  query {
    isLoggedIn @client
    cacheLoaded @client
    notificationsEnabled @client
  }
`;

export const resolvers = {
  Mutation: {
    cacheMarkLoaded: async (root, args, { cache, client }) => {
      cache.writeQuery({
        query: CACHE_LOADED,
        data: {
          cacheLoaded: true,
        },
      });
      const { data: { isLoggedIn } = {} } = await client.query({
        query: GET_LOGGED_IN,
      });

      const { pushId } = cache.readQuery({
        query: gql`
          query {
            pushId @client
          }
        `,
      });

      if (isLoggedIn && pushId) {
        updatePushId({ pushId, client });
      }
      return null;
    },
    markNotificationRead: async (root, args) => {
      const readCount = parseInt(
        (await AsyncStorage.getItem('Notification/readCount')) || '0',
        10
      );

      await AsyncStorage.multiSet([
        ['Notification/readCount', (readCount + 1).toString(10)],
        [`Notification/${args.id}/read`, 'true'],
      ]);
    },
  },
  NotificationHistory: {
    read: async () =>
      parseInt(
        (await AsyncStorage.getItem('Notification/readCount')) || '0',
        10
      ),
  },
  Notification: {
    read: async ({ id }) =>
      (await AsyncStorage.getItem(`Notification/${id}/read`)) == 'true',
  },
};
