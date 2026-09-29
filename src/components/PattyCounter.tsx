import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../constants/theme';
import { PattyCounterSummary } from '../types/kds';

interface PattyCounterProps {
  summary: PattyCounterSummary;
}

export const PattyCounter: React.FC<PattyCounterProps> = ({ summary }) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftCol}>
        <View style={styles.badgeRow}>
          <View style={styles.flameIndicator} />
          <Text style={styles.eyebrow}>CONTROLE DE CHAPA</Text>
        </View>
        <Text style={styles.mainLabel}>Total de Carnes a Grelhar</Text>
      </View>

      <View style={styles.rightCol}>
        <View style={styles.counterBox}>
          <Text style={styles.counterValue}>{summary.totalPendingPatties}</Text>
          <Text style={styles.counterUnit}>carnes</Text>
        </View>

        <View style={styles.subStats}>
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Na Chapa:</Text>
            <Text style={[styles.statPillValue, { color: THEME.colors.warning }]}>
              {summary.preparingPatties}
            </Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statPillLabel}>Aguardando:</Text>
            <Text style={[styles.statPillValue, { color: THEME.colors.primary }]}>
              {summary.queuedPatties}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.grillBackground,
    borderColor: THEME.colors.grillBorder,
    borderWidth: 1.5,
    borderRadius: THEME.borderRadius.lg,
    paddingVertical: THEME.spacing.md,
    paddingHorizontal: THEME.spacing.lg,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  flameIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.colors.grillAmber,
    marginRight: 6,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: THEME.colors.grillAmber,
  },
  mainLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: THEME.colors.textPrimary,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.grillAmber,
    borderWidth: 1,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  counterValue: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.colors.grillAmber,
    lineHeight: 32,
  },
  counterUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
  },
  subStats: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 4,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.sm,
  },
  statPillLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginRight: 4,
    fontWeight: '500',
  },
  statPillValue: {
    fontSize: 11,
    fontWeight: '800',
  },
});
