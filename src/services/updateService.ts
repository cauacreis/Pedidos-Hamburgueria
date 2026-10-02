import * as Updates from 'expo-updates';

export class UpdateService {
  /**
   * Verifica e baixa atualizações Over-The-Air silenciosamente em segundo plano
   * Ocorre sem travar o aplicativo ou exibir jargões técnicos na interface
   */
  static async checkAndApplySilentUpdate(): Promise<boolean> {
    try {
      // Em modo de desenvolvimento ou web, Updates.isEnabled é falso
      if (!Updates.isEnabled) {
        return false;
      }

      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        // Baixa o novo bundle de código silenciosamente
        await Updates.fetchUpdateAsync();
        return true;
      }
    } catch {
      // Falhas de rede são ignoradas silenciosamente para não interromper a operação da hamburgueria
    }
    return false;
  }
}
