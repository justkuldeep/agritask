import { Tabs, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useAuth } from '../../services/authStore';
import { Colors, Typography } from '../../constants/theme';

function TabIcon({ emoji, label, focused }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();

  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [loading, isAuthenticated]);

  if (!isAuthenticated) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="✅" label="Tasks" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📍" label="Attend" focused={focused} />
          ),
        }}
      />
      {/* Tracking tab — only shown to OWNER and MANAGER */}
      <Tabs.Screen
        name="tracking"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🗺️" label="Track" focused={focused} />
          ),
          tabBarButton: isManager ? undefined : () => null,
          tabBarItemStyle: isManager ? undefined : { display: 'none', width: 0 },
        }}
      />
      {/* Team tab — only shown to OWNER and MANAGER */}
      <Tabs.Screen
        name="team"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👥" label="Team" focused={focused} />
          ),
          tabBarButton: isManager ? undefined : () => null,
          tabBarItemStyle: isManager ? undefined : { display: 'none', width: 0 },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔔" label="Alerts" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBar,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabEmoji: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabEmojiActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.tabInactive,
    marginTop: 2,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: Colors.tabActive,
    fontWeight: '600',
  },
});
