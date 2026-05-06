/**
 * Notifications Screen
 */
import React, { useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../../hooks/useNotifications';
import EmptyState from '../../components/ui/EmptyState';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Colors, Spacing, Typography, Radius } from '../../constants/theme';

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { notifications, unreadCount, loading, fetchNotifications, markRead } =
    useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, []);

  function renderItem({ item }) {
    const isUnread = !item.read_at;
    return (
      <TouchableOpacity
        style={[styles.item, isUnread && styles.itemUnread]}
        onPress={() => isUnread && markRead(item.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.dot, isUnread ? styles.dotUnread : styles.dotRead]} />
        <View style={styles.itemContent}>
          <Text style={[styles.itemTitle, isUnread && styles.itemTitleUnread]}>
            {item.title || 'Notification'}
          </Text>
          {item.body && (
            <Text style={styles.itemBody} numberOfLines={2}>
              {item.body}
            </Text>
          )}
          <Text style={styles.itemTime}>
            {new Date(item.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {loading && notifications.length === 0 ? (
        <LoadingSpinner message="Loading notifications..." />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchNotifications}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={<Text style={{ fontSize: 48 }}>🔔</Text>}
              title="No notifications"
              subtitle="You're all caught up!"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    flex: 1,
  },
  badge: {
    backgroundColor: Colors.error,
    borderRadius: Radius.full,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: Typography.bold,
    color: '#fff',
  },
  list: {
    paddingTop: Spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  itemUnread: {
    backgroundColor: 'rgba(34, 197, 94, 0.04)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: Spacing.md,
    flexShrink: 0,
  },
  dotUnread: {
    backgroundColor: Colors.primary,
  },
  dotRead: {
    backgroundColor: Colors.secondary,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    fontWeight: Typography.regular,
    marginBottom: 3,
  },
  itemTitleUnread: {
    color: Colors.textPrimary,
    fontWeight: Typography.semibold,
  },
  itemBody: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 4,
  },
  itemTime: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
});
