import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { ApolloProvider, ApolloClient, ApolloLink } from '@apollo/client';
import { getVersion, getApplicationName } from 'react-native-device-info';
import { mergeTypeDefs } from '@graphql-tools/merge';

import { authLink, buildErrorLink } from '@apollosproject/ui-auth';

import { NavigationService } from '@apollosproject/ui-kit';
import { resolvers, schema, defaults, GET_ALL_DATA } from '../store';

import httpLink from './httpLink';
import cache, { ensureCacheHydration } from './cache';
import MARK_CACHE_LOADED from './markCacheLoaded';
import {
  localSchema,
  localResolvers,
  ensureContentfulLoaded,
} from './contentful';

const goToAuth = () => NavigationService.resetToAuth();
const wipeData = () =>
  cache.writeQuery({ query: GET_ALL_DATA, data: defaults });

let clearStore;
let storeIsResetting = false;
const onAuthError = async () => {
  if (!storeIsResetting) {
    storeIsResetting = true;
    await clearStore();
  }
  storeIsResetting = false;
  goToAuth();
};

const errorLink = buildErrorLink(onAuthError);

const link = ApolloLink.from([authLink, errorLink, httpLink]);

export const client = new ApolloClient({
  link,
  cache,
  queryDeduplication: false,
  shouldBatch: true,
  resolvers: {
    ...localResolvers,
    ...resolvers,
  },
  typeDefs: mergeTypeDefs(schema, localSchema),
  name: getApplicationName(),
  version: getVersion(),
  // NOTE: this is because we have some very taxing queries that we want to avoid running twice
  // see if it's still an issue after we're operating mostly on Postgres and have less loading states
  defaultOptions: {
    watchQuery: {
      nextFetchPolicy(lastFetchPolicy) {
        if (
          lastFetchPolicy === 'cache-and-network' ||
          lastFetchPolicy === 'network-only'
        ) {
          return 'cache-first';
        }
        return lastFetchPolicy;
      },
    },
  },
});

if (process.env.NODE_ENV === 'development') {
  const {
    enableFlipperApolloDevtools,
  } = require('react-native-flipper-apollo-devtools');
  enableFlipperApolloDevtools(client);
}

// Hack to give auth link access to method on client;
// eslint-disable-next-line prefer-destructuring
clearStore = client.clearStore;

wipeData();
// Ensure that media player still works after logout.
client.onClearStore(() => wipeData());

class ClientProvider extends PureComponent {
  static propTypes = {
    client: PropTypes.shape({
      cache: PropTypes.shape({}),
    }),
    children: PropTypes.oneOfType([
      PropTypes.arrayOf(PropTypes.node),
      PropTypes.node,
      PropTypes.object, // covers Fragments
    ]).isRequired,
  };

  static defaultProps = {
    client,
  };

  async componentDidMount() {
    try {
      await Promise.all([ensureCacheHydration, ensureContentfulLoaded]);
    } catch (e) {
      throw e;
    } finally {
      client.mutate({ mutation: MARK_CACHE_LOADED });
    }
  }

  render() {
    const { children, ...otherProps } = this.props;
    return (
      <ApolloProvider {...otherProps} client={client}>
        {children}
      </ApolloProvider>
    );
  }
}

export default ClientProvider;
