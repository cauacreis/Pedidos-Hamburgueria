export const THEME = {
  colors: {
    // Warm Bodega Street-Food Dark Theme
    background: '#12100F',       // Carvão profundo e quente (fundo geral)
    backgroundSubtle: '#181513', // Camada secundária de fundo
    surface: '#1E1917',          // Base dos cards e barras principais
    surfaceElevated: '#282220',  // Elementos elevados e campos de texto
    surfaceBorder: '#3A322E',    // Bordas sutis com temperatura quente
    surfaceBorderSubtle: 'rgba(255, 255, 255, 0.07)',
    surfaceBorderHighlight: 'rgba(255, 255, 255, 0.15)',
    surfaceHighlight: '#4A3F3B', // Destaques sutis / hovers
    
    // Identidade Bodega do Vidigal (Tons da Logo Oficial)
    primary: '#BE3827',          // Vermelho clássico do anel e marca Bodega
    primaryHover: '#A82F1F',
    primaryLight: 'rgba(190, 56, 39, 0.16)',
    primaryGlow: 'rgba(190, 56, 39, 0.35)',
    primaryDeep: '#8E2519',
    
    // Verde Oliva (Inspirado no chapéu com "VIDIGAL")
    secondary: '#7E934E',        // Verde oliva do chapéu
    secondaryHover: '#6E8340',
    secondaryLight: 'rgba(126, 147, 78, 0.18)',
    secondaryGlow: 'rgba(126, 147, 78, 0.30)',
    
    // Ouro & Âmbar Artesanal
    gold: '#E5A93C',             // Dourado mostarda artesanal
    goldLight: 'rgba(229, 169, 60, 0.16)',
    goldBorder: 'rgba(229, 169, 60, 0.35)',

    // Status e Indicadores Operacionais
    success: '#729443',          // Verde oliva (Pronto / Conectado)
    successLight: 'rgba(114, 148, 67, 0.18)',
    successBorder: 'rgba(114, 148, 67, 0.40)',
    warning: '#E58E26',          // Âmbar artesanal (Em preparo / Atenção)
    warningLight: 'rgba(229, 142, 38, 0.18)',
    warningBorder: 'rgba(229, 142, 38, 0.40)',
    danger: '#D32F2F',           // Vermelho alerta (Urgente / Desconectado)
    dangerLight: 'rgba(211, 47, 47, 0.18)',
    dangerBorder: 'rgba(211, 47, 47, 0.40)',
    info: '#4A90E2',
    infoLight: 'rgba(74, 144, 226, 0.16)',
    
    // Tipografia de Alto Contraste e Conforto Visual
    textPrimary: '#FAF7F2',      // Creme claro suave (alta legibilidade)
    textSecondary: '#BDB3AB',    // Tom de pedra quente intermediário
    textMuted: '#827872',        // Texto auxiliar discreto
    textInverse: '#12100F',      // Para fundos claros
    
    // Controle de Chapa & Braseiro (Harmonizado com a paleta)
    grillAmber: '#E25822',       // Fogo da chapa
    grillEmber: '#8E2519',       // Brasa
    grillBackground: '#221513',  // Fundo de ferro fundido quente
    grillBorder: '#5C241D',      // Borda quente
    grillBorderGlow: 'rgba(226, 88, 34, 0.4)',
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
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    full: 9999,
  },
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    glowPrimary: {
      shadowColor: '#BE3827',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    glowSuccess: {
      shadowColor: '#729443',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
    glowWarning: {
      shadowColor: '#E58E26',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 6,
    },
  },
  typography: {
    fontFamilyMono: 'monospace',
  },
};
