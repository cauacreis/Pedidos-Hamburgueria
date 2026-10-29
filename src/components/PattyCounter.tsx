import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Clock, CheckCircle2 } from 'lucide-react-native';
import { THEME } from '../constants/theme';
import { PattyCounterSummary } from '../types/kds';

interface PattyCounterProps {
  summary: PattyCounterSummary;
}

export const PattyCounter: React.FC<PattyCounterProps> = ({ summary }) => {
  const isClear = summary.totalPendingPatties === 0;

  return (
    <View style={[styles.container, isClear && styles.containerClear]}>
      {/* Coluna Esquerda: Título e Status */}
      <View style={styles.leftCol}>
        <View style={styles.badgeRow}>
          <View style={[styles.flameIndicator, isClear && styles.flameIndicatorClear]}>
            {isClear ? (
              <CheckCircle2 size={12} color={THEME.colors.success} />
            ) : (
              <Flame size={12} color={THEME.colors.grillAmber} />
            )}
          </View>
          <Text style={[styles.eyebrow, isClear && styles.eyebrowClear]}>
            {isClear ? 'CHAPA EM ESPERA' : 'CONTROLE DE CHAPA'}
          </Text>
        </View>

        <Text style={styles.mainLabel}>
          {isClear ? 'Nenhuma carne pendente' : 'Total de Carnes a Grelhar'}
        </Text>
      </View>

      {/* Coluna Direita: Grande Contador e Detalhamento */}
      <View style={styles.rightCol}>
        <View style={[styles.counterBox, isClear && styles.counterBoxClear]}>
          <Text style={[styles.counterValue, isClear && styles.counterValueClear]}>
            {summary.totalPendingPatties}
          </Text>
          <Text style={styles.counterUnit}>
            {summary.totalPendingPatties === 1 ? 'carne' : 'carnes'}
          </Text>
        </View>

        <View style={styles.subStats}>
          <View style={styles.statPill}>
            <Flame size={11} color={THEME.colors.warning} style={styles.statIcon} />
            <Text style={styles.statPillLabel}>Na Chapa:</Text>
            <Text style={[styles.statPillValue, { color: THEME.colors.warning }]}>
              {summary.preparingPatties}
            </Text>
          </View>

          <View style={styles.statPill}>
            <Clock size={11} color={THEME.colors.primary} style={styles.statIcon} />
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  containerClear: {
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.surfaceBorder,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
  },
  leftCol: {
    flex: 1,
    paddingRight: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  flameIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(226, 88, 34, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  flameIndicatorClear: {
    backgroundColor: THEME.colors.successLight,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: THEME.colors.grillAmber,
  },
  eyebrowClear: {
    color: THEME.colors.success,
  },
  mainLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.textPrimary,
  },
  rightCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBox: {
    backgroundColor: THEME.colors.surfaceElevated,
    borderColor: THEME.colors.grillAmber,
    borderWidth: 1.5,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    minWidth: 70,
  },
  counterBoxClear: {
    borderColor: THEME.colors.surfaceBorder,
  },
  counterValue: {
    fontSize: 28,
    fontWeight: '900',
    color: THEME.colors.grillAmber,
    lineHeight: 32,
    letterSpacing: 0.5,
  },
  counterValueClear: {
    color: THEME.colors.textSecondary,
  },
  counterUnit: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
    paddingVertical: 3,
    borderRadius: THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: THEME.colors.surfaceBorderSubtle,
  },
  statIcon: {
    marginRight: 4,
  },
  statPillLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginRight: 4,
    fontWeight: '600',
  },
  statPillValue: {
    fontSize: 11,
    fontWeight: '900',
  },
});
