import React from 'react';
import { Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { withTheme } from '@apollosproject/ui-kit';

import Connect from './connect';
import Home from './home';
import Discover from './discover';
import Schedule from './schedule';
import MySchedule from './my-schedule';
import tabBarIcon from './tabBarIcon';

const { Navigator, Screen } = createBottomTabNavigator();

const TabNavigator = (props) => (
  <Navigator {...props} lazy>
    <Screen
      name="Home"
      component={Home}
      options={{
        tabBarIcon: tabBarIcon('home'),
      }}
    />
    <Screen
      name="Schedule"
      component={Schedule}
      options={{ tabBarIcon: tabBarIcon('calendar') }}
    />
    <Screen
      name="My CLC"
      component={MySchedule}
      options={{ tabBarIcon: tabBarIcon('circle-outline-check-mark') }}
    />
    <Screen
      name="Tracks"
      component={Discover}
      options={{ tabBarIcon: tabBarIcon('sections') }}
    />
    <Screen
      name="Connect"
      component={Connect}
      options={{ tabBarIcon: tabBarIcon('profile') }}
    />
  </Navigator>
);

const ThemedTabNavigator = withTheme(({ theme }) => ({
  tabBarOptions: {
    activeTintColor: theme?.colors?.secondary,
    inactiveTintColor: theme?.colors?.text?.tertiary,
    style: {
      backgroundColor: theme?.colors?.background?.paper,
      borderTopColor: theme?.colors?.shadows.default,
      ...Platform.select(theme?.shadows.default),
    },
  },
}))(TabNavigator);

export default ThemedTabNavigator;
