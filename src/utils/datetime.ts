export const formatNigerianDateTime = (date: Date): string => {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date)
}

export const formatNigerianDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

export const formatNigerianTime = (date: Date): string => {
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date)
}

export const getNigerianTime = (): Date => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Lagos" }))
}
