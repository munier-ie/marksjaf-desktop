export const getToken = (): string | null => {
  return localStorage.getItem('access_token') || localStorage.getItem('token')
}

export const setToken = (token: string): void => {
  localStorage.setItem('access_token', token)
}

export const removeToken = (): void => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('token')
  localStorage.removeItem('refresh_token')
}

export const isAuthenticated = (): boolean => {
  const token = getToken()
  return !!token
}