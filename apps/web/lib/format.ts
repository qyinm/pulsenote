const utcTimestampFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
})

export function formatUtcTimestamp(value: string) {
  return `${utcTimestampFormatter.format(new Date(value))} UTC`
}
