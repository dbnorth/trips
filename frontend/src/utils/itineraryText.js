const MONTHS = [
  ["january", 1],
  ["february", 2],
  ["march", 3],
  ["april", 4],
  ["september", 9],
  ["october", 10],
  ["november", 11],
  ["december", 12],
  ["august", 8],
  ["sept", 9],
  ["july", 7],
  ["june", 6],
  ["jan", 1],
  ["feb", 2],
  ["mar", 3],
  ["apr", 4],
  ["may", 5],
  ["jun", 6],
  ["jul", 7],
  ["aug", 8],
  ["sep", 9],
  ["oct", 10],
  ["nov", 11],
  ["dec", 12],
];

const MONTH_BY_NAME = Object.fromEntries(MONTHS);
const MONTH_PATTERN = MONTHS.map(([name]) => name).join("|");
const MON3 = "JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC";

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pad = (value) => String(value).padStart(2, "0");

const isoDate = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
};

const displayDate = (iso) => {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
};

const displayTime = (hhmm) => {
  const [hourText, minute] = hhmm.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${suffix}`;
};

const addDays = (iso, days) => {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

const findDates = (text, yearFallback) => {
  const pattern = new RegExp(
    `\\b(?:(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})|(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})|(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})\\s+(\\d{4})|(\\d{2})(${MON3})(\\d{4})?)\\b`,
    "gi"
  );
  const dates = [];
  for (const match of text.matchAll(pattern)) {
    let year;
    let month;
    let day;
    if (match[1]) {
      month = Number(match[1]);
      day = Number(match[2]);
      year = Number(match[3]);
    } else if (match[4]) {
      month = MONTH_BY_NAME[match[4].toLowerCase()];
      day = Number(match[5]);
      year = Number(match[6]);
    } else if (match[7]) {
      day = Number(match[7]);
      month = MONTH_BY_NAME[match[8].toLowerCase()];
      year = Number(match[9]);
    } else {
      day = Number(match[10]);
      month = MONTH_BY_NAME[match[11].toLowerCase()];
      year = match[12] ? Number(match[12]) : yearFallback;
    }
    const iso = year ? isoDate(year, month, day) : null;
    if (!iso) continue;
    dates.push({ type: "date", index: match.index, end: match.index + match[0].length, iso });
  }
  return dates;
};

const findTimes = (text) => {
  const pattern = /\b(\d{1,2}):(\d{2})\s*([ap])\.?m?\.?\b|\b(\d{1,2}):(\d{2})\b/gi;
  const times = [];
  for (const match of text.matchAll(pattern)) {
    let hhmm;
    if (match[3]) {
      let hour = Number(match[1]);
      const minute = Number(match[2]);
      if (hour < 1 || hour > 12 || minute > 59) continue;
      const pm = match[3].toLowerCase() === "p";
      if (hour === 12) hour = pm ? 12 : 0;
      else if (pm) hour += 12;
      hhmm = `${pad(hour)}:${pad(minute)}`;
    } else {
      const hour = Number(match[4]);
      const minute = Number(match[5]);
      if (hour > 23 || minute > 59) continue;
      hhmm = `${pad(hour)}:${pad(minute)}`;
    }
    times.push({ type: "time", index: match.index, end: match.index + match[0].length, hhmm });
  }
  return times;
};

const overlaps = (start, end, spans) => spans.some((span) => start < span.end && end > span.index);

/** Airline codes with no letter match years (catalog code 20 inside 2026). */
const findFlightMentions = (text, airlines, dateSpans) => {
  const codes = [...new Set((airlines || []).map((airline) => String(airline.code || "").toUpperCase()))]
    .filter((code) => /[A-Za-z]/.test(code))
    .sort((a, b) => b.length - a.length);
  const mentions = [];
  for (const code of codes) {
    const pattern = new RegExp(`\\b${escapeRegExp(code)}\\s*(\\d{1,4})\\b`, "gi");
    for (const match of text.matchAll(pattern)) {
      const index = match.index;
      const end = index + match[0].length;
      if (overlaps(index, end, dateSpans)) continue;
      mentions.push({ index, end, code, flightNumber: match[1] });
    }
  }
  mentions.sort((a, b) => a.index - b.index || b.code.length - a.code.length);
  const kept = [];
  let lastEnd = -1;
  for (const mention of mentions) {
    if (mention.index < lastEnd) continue;
    kept.push(mention);
    lastEnd = mention.end;
  }
  return kept;
};

const findAirports = (text, airports) => {
  const codes = new Set(
    (airports || []).map((airport) => String(airport.code || "").toUpperCase()).filter(Boolean)
  );
  if (!codes.size) return [];
  const found = [];
  for (const match of text.matchAll(/\b[A-Za-z0-9]{2,4}\b/g)) {
    const code = match[0].toUpperCase();
    if (!codes.has(code)) continue;
    found.push({ type: "airport", index: match.index, end: match.index + match[0].length, code });
  }
  return found;
};

const collectEndpoints = (slice, state) => {
  const endpoints = [];
  let open = null;
  const close = () => {
    if (open?.airport && open?.time) {
      endpoints.push({ airport: open.airport, time: open.time, date: open.date || state.headerDate });
    }
    open = null;
  };
  for (const token of slice) {
    if (token.type === "date") {
      if (open && !open.time) open.date = token.iso;
      else if (!open && endpoints.length) {
        const previous = endpoints[endpoints.length - 1];
        if (previous.date && addDays(previous.date, 1) === token.iso) previous.date = token.iso;
      }
      state.headerDate = token.iso;
      continue;
    }
    if (token.type === "airport") {
      if (open?.time) close();
      if (open?.airport && !open.time) open.airport = token.code;
      else open = { airport: token.code, date: null, time: null };
      continue;
    }
    if (token.type === "time" && open?.airport && !open.time) {
      open.time = token.hhmm;
      if (!open.date) open.date = state.headerDate;
      close();
    }
  }
  close();
  return endpoints;
};

const oneLine = (value) => value.replace(/\s+/g, " ").trim();

const findConfirmationCode = (text) => {
  const match = text.match(/\bConfirmation\s+(?:code|number)\s*:?\s*([A-Za-z0-9]{4,50})\b/i);
  return match ? match[1].toUpperCase().slice(0, 50) : "";
};

const findSeats = (text) => {
  const seats = [];
  for (const match of text.matchAll(/\bSeat\s*:\s*([A-Za-z0-9]{1,20})\b/gi)) {
    seats.push({ index: match.index, seat: match[1].toUpperCase() });
  }
  return seats;
};

const compareFlights = (a, b) =>
  a.departureDate.localeCompare(b.departureDate) ||
  a.departureTime.localeCompare(b.departureTime) ||
  a.index - b.index;

/**
 * Read flights from an airline itinerary email.
 * @returns {{ text: string, flights: Array }}
 */
const daysBetween = (earlier, later) => {
  const [yearA, monthA, dayA] = earlier.split("-").map(Number);
  const [yearB, monthB, dayB] = later.split("-").map(Number);
  return Math.round((Date.UTC(yearB, monthB - 1, dayB) - Date.UTC(yearA, monthA - 1, dayA)) / 86400000);
};

/** Earlier leaving dates are arrival. Later leaving dates are return. The largest gap is the split. */
const splitDepartureDate = (flights) => {
  const dates = [...new Set(flights.map((flight) => flight.departureDate))].sort();
  if (dates.length < 2) return dates[0] || "";
  let splitAfter = dates[0];
  let largestGap = -1;
  for (let index = 0; index < dates.length - 1; index += 1) {
    const gap = daysBetween(dates[index], dates[index + 1]);
    if (gap > largestGap) {
      largestGap = gap;
      splitAfter = dates[index];
    }
  }
  return splitAfter;
};

export const parseItineraryText = (raw, { airlines = [], airports = [], tripStartDate = "" } = {}) => {
  const text = String(raw || "");
  const yearFallback = /^\d{4}/.test(tripStartDate) ? Number(tripStartDate.slice(0, 4)) : null;
  const dateSpans = findDates(text, yearFallback);
  const mentions = findFlightMentions(text, airlines, dateSpans);
  const seats = findSeats(text);
  const confirmationNumber = findConfirmationCode(text);
  const tokens = [...dateSpans, ...findTimes(text), ...findAirports(text, airports)].sort(
    (a, b) => a.index - b.index
  );
  const between = (start, end) => tokens.filter((token) => token.index >= start && token.index < end);
  const state = { headerDate: null };
  const gaps = mentions.map((mention, index) =>
    collectEndpoints(between(index === 0 ? 0 : mentions[index - 1].end, mention.index), state)
  );
  gaps.push(collectEndpoints(between(mentions.at(-1)?.end ?? 0, text.length + 1), state));

  const read = [];
  const unread = [];
  let carry = gaps[0];
  mentions.forEach((mention, index) => {
    const next = mentions[index + 1]?.index ?? text.length;
    const section = oneLine(text.slice(mention.index, next));
    const following = gaps[index + 1];
    const needed = Math.max(0, 2 - carry.length);
    const mine = [...carry, ...following.slice(0, needed)];
    carry = following.slice(mine.length - carry.length);
    const departure = mine[0];
    const arrival = mine[1];
    if (!departure?.airport || !arrival?.airport || !departure.time || !arrival.time || !departure.date) {
      unread.push(section);
      return;
    }
    let arrivalDate = arrival.date || departure.date;
    if (arrivalDate === departure.date && arrival.time < departure.time) arrivalDate = addDays(departure.date, 1);
    const seat = seats.find((item) => item.index >= mention.index && item.index < next);
    read.push({
      index: mention.index,
      airlineCode: mention.code,
      flightNumber: mention.flightNumber,
      departureAirportCode: departure.airport,
      arrivalAirportCode: arrival.airport,
      departureDate: departure.date,
      arrivalDate,
      departureTime: departure.time,
      arrivalTime: arrival.time,
      seatNumber: seat?.seat || "",
    });
  });

  const splitAfter = splitDepartureDate(read);
  const directionOf = (flight) => (flight.departureDate <= splitAfter ? "arrival" : "return");

  const flights = ["arrival", "return"].flatMap((segmentType) =>
    read
      .filter((flight) => directionOf(flight) === segmentType)
      .sort(compareFlights)
      .map((flight, index) => ({
        ...flight,
        segmentType,
        segmentNumber: index + 1,
      }))
  );

  const lines = [];
  if (confirmationNumber) lines.push(`Confirmation code: ${confirmationNumber}`);
  for (const flight of flights) {
    const seat = flight.seatNumber ? `, seat ${flight.seatNumber}` : "";
    lines.push(
      `${flight.airlineCode} ${flight.flightNumber}: ${flight.departureAirportCode} ${displayDate(flight.departureDate)} ${displayTime(flight.departureTime)} to ${flight.arrivalAirportCode} ${displayDate(flight.arrivalDate)} ${displayTime(flight.arrivalTime)}${seat}`
    );
  }
  for (const section of unread) lines.push(`Not read: "${section}".`);

  return {
    flights,
    confirmationNumber,
    text: lines.length ? lines.join("\n") : "No flights were read.",
  };
};
