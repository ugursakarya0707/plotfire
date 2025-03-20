/**
 * Kimlik doğrulama ile ilgili yardımcı fonksiyonlar
 */

/**
 * JWT token'ı yerel depodan alır
 * @returns JWT token
 */
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

/**
 * API istekleri için kimlik doğrulama başlığını döndürür
 * @returns Kimlik doğrulama başlığı içeren nesne
 */
export const getAuthHeader = (): { Authorization: string } | {} => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
