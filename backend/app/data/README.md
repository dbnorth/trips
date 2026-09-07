# Airport & airline catalogs

Global IATA lists used by Feature 30 flight segments.

| File | Contents | Source |
|------|----------|--------|
| `airports.json` | IATA code, airport name, city, country | [OpenFlights](https://github.com/jpatokal/openflights) `airports.dat` (rows with a 3-letter IATA code) |
| `airlines.json` | IATA code, airline name | OpenFlights `airlines.dat` (active airlines with a 2-character IATA code) |

Seed (idempotent — inserts missing codes only):

```bash
cd backend && npm run seed:catalogs
```

`npm run seed` also runs this after roles/admin.
