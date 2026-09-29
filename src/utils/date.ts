/**
 * Utilitários para formatação e manipulação de datas no contexto de food service.
 * Garante consistência de fuso horário local e evita o bug clássico de virada de turno
 * que ocorre às 21h (horário de Brasília / UTC 00:00).
 */

/**
 * Retorna a data no formato YYYY-MM-DD baseada no horário local do dispositivo.
 */
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
