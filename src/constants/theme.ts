export const THEME = {
  colors: {
    // Warm Bodega Street-Food Dark Theme
    background: '#141211',       // Carvão profundo e quente (fundo geral)
    surface: '#1D1918',          // Base dos cards e barras
    surfaceElevated: '#272221',  // Elementos elevados e campos de texto
    surfaceBorder: '#3D3533',    // Bordas sutis com temperatura quente
    surfaceHighlight: '#4A413E', // Destaques sutis / hovers
    
    // Identidade Bodega do Vidigal (Tons da Logo)
    primary: '#BE3827',          // Vermelho clássico do anel e marca Bodega
    primaryHover: '#A82F1F',
    primaryLight: 'rgba(190, 56, 39, 0.15)',
    primaryGlow: 'rgba(190, 56, 39, 0.35)',
    
    // Verde Oliva (Inspirado no chapéu com "VIDIGAL")
    secondary: '#7E934E',        // Verde oliva do chapéu
    secondaryHover: '#6E8340',
    secondaryLight: 'rgba(126, 147, 78, 0.18)',
    
    // Status e Indicadores Operacionais
    success: '#729443',          // Verde oliva (Pronto / Conectado)
    successLight: 'rgba(114, 148, 67, 0.18)',
    warning: '#E58E26',          // Âmbar artesanal (Em preparo / Atenção)
    warningLight: 'rgba(229, 142, 38, 0.18)',
    danger: '#D32F2F',           // Vermelho alerta (Urgente / Desconectado)
    dangerLight: 'rgba(211, 47, 47, 0.18)',
    info: '#4A90E2',
    
    // Tipografia de Alto Contraste
    textPrimary: '#FAF8F5',      // Creme claro suave (alta legibilidade)
    textSecondary: '#A89F9A',    // Tom de pedra quente
    textMuted: '#756C67',        // Texto auxiliar discreto
    textInverse: '#141211',      // Para fundos claros
    
    // Controle de Chapa & Braseiro (Harmonizado com a paleta)
    grillAmber: '#BE3827',
    grillEmber: '#8E2519',
    grillBackground: '#201514',
    grillBorder: '#54201A',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    full: 9999,
  },
  typography: {
    fontFamilyMono: 'monospace',
  },
};
