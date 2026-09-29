import React from 'react';
import { View, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
import { OfflineDashboard } from '../components/OfflineDashboard';

export const DashboardScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <OfflineDashboard />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
});
