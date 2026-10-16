# Local Food Market Platform

A platform that collects data on local food markets (farmers markets, farm stands, CSAs, food hubs, and on-farm markets), makes it easy for consumers to shop locally and sustainably, and rewards vendors who adopt sustainable practices.

---

## 1. Problem and Goals

Information about local food markets is spread across city websites, social media pages, paper flyers, and government directories that are often out of date. Because of this, consumers fall back on supermarkets, even when a nearby market sells fresher, lower-impact food and accepts their payment method or food-assistance benefits.

**Goals**

| Audience | Goal |
|---|---|
| Consumers | Find nearby markets that are open now, carry what they need, accept their payment method, and match their sustainability values. |
| Vendors / Sellers | Reach more customers, cut food waste, simplify logistics, and get rewarded for sustainable practices. |
| Market managers | Manage vendor rosters, schedules, and program participation in one place. |
| Communities / Researchers | Use aggregated data to study food access, food deserts, and local food economies. |

---

## 2. Core Data Domains

The platform is built around the data categories below. Each section lists the key fields and what they're used for.

### 2.1 Geographic Distribution
Where markets and vendors are located, and who they serve.

- **Fields:** market name, street address, city, county, state, ZIP, latitude/longitude, location type (park, parking lot, church, school, farm, indoor hall), indoor/outdoor, accessibility notes (ADA, parking, transit stops nearby).
- **Derived data:** distance from user, travel time by walking/transit/bike/car, service radius, overlap with USDA food-desert / low-income low-access tracts, population density.
- **Features:** interactive map, "near me" search, clustering, heatmaps of market density vs. need, and route suggestions that cut down on driving.

### 2.2 Operating Schedules
When markets are open, including changes by season.

- **Fields:** season start/end dates, day of week, open/close times, year-round flag, holiday closures, weather cancellations, special event days.
- **Features:** "open now" filter, calendar view, reminders/notifications, live status updates from managers (e.g., "closed due to rain"), and time zone handling.
- **Data concerns:** recurring rules (e.g., "every 2nd and 4th Saturday") should be stored in a standard format (iCal RRULE) rather than free text.

### 2.3 Products
What is sold, and in which season.

- **Categories (expandable):** fruits, vegetables, herbs, meat, poultry, seafood, eggs, dairy, cheese, baked goods, honey, maple syrup, jams/preserves, nuts, grains/flour, beans, mushrooms, tofu/plant proteins, prepared foods, coffee/tea, wine/cider/beer, juice, flowers, plants/nursery, soap/body care, crafts, pet food, firewood.
- **Attributes:** certified organic, Certified Naturally Grown, pesticide-free, grass-fed, pasture-raised, free-range, non-GMO, regenerative, heirloom, halal/kosher, vegan, gluten-free, allergen info.
- **Seasonality:** a crop calendar by region so users can see what's in season and plan meals around it.
- **Features:** product search ("where can I find local strawberries this week?"), shopping lists matched to vendors, and seasonal recipe suggestions.

### 2.4 Vendors
The farmers, producers, and artisans who sell at markets.

- **Fields:** business name, owner/contact, description, farm location, distance from farm to market (food miles), markets attended, products offered, certifications, photos, website/social links.
- **Sustainability profile:** growing practices, water use, packaging (plastic-free, compostable, reusable containers), renewable energy, waste practices, labor practices, and demographic badges such as small, beginning, BIPOC-owned, women-owned, or veteran-owned farm.
- **Features:** vendor pages, follow/favorite, reviews, verified badges, and "meet your farmer" stories.

### 2.5 Payment Methods
How customers can pay.

- **Fields:** cash, credit/debit, mobile pay (Apple Pay, Google Pay, Venmo, Cash App), checks, market tokens/scrip, gift cards, and food-assistance benefits (see 2.6). Tracked **at both market and vendor level**, because individual vendors often differ from their market.
- **Features:** filter by payment method, an "accepts my benefits" filter, and optional in-app pre-orders and payments.

### 2.6 Food-Access Programs
Federal, state, and local programs that make fresh food affordable.

- **Programs:** SNAP/EBT, WIC Farmers' Market Nutrition Program (FMNP), Senior Farmers' Market Nutrition Program (SFMNP), WIC Cash Value Benefit, Double Up Food Bucks and other SNAP incentive/matching programs (GusNIP-funded), Healthy Incentives Program (HIP, MA), produce prescription programs, and local voucher programs.
- **Fields:** programs accepted by each market/vendor, match rates and caps, eligibility notes, how to redeem (e.g., visit the info booth for tokens), and program funding status.
- **Features:** a benefits calculator ("$20 SNAP becomes $40 with Double Up"), plain-language guides, multilingual support, and a map of benefit-accepting markets.
- **Privacy:** never store a user's benefit status unless they choose to; filtering should work without an account.

### 2.7 Vendor Logistics
How goods get from farm to market to consumer.

- **Fields:** stall assignment, booth size, power/water needs, load-in/load-out times, vehicle type, cold-chain capability, delivery radius, pickup points, minimum order size, wholesale availability, and inventory levels.
- **Features:**
  - Pre-order and pickup ("order by Thursday, pick up Saturday")
  - Shared delivery routes / aggregation through food hubs to cut trips and emissions
  - Surplus and unsold-inventory listings (end-of-day discounts, donations to food banks, gleaning)
  - Market manager tools: vendor applications, stall maps, fee collection, attendance tracking

### 2.8 Prices
What things cost, and how that changes over time.

- **Fields:** product, unit (lb, each, bunch, dozen, pint), price, organic/conventional, date observed, source (vendor-entered, manager-reported, crowd-sourced).
- **Features:** price comparison across vendors and against supermarket averages, price trends over the season, budget planning, and "best value this week" highlights.
- **Data concerns:** units must be normalized for fair comparison, and stale prices should be flagged.

### 2.9 Sales
Transaction data used for analytics and incentives (aggregated and access-controlled).

- **Fields:** sales volume by product/vendor/market/date, number of transactions, payment-method breakdown, benefit-program redemptions, foot traffic counts, and sell-through/waste rate.
- **Features:**
  - Vendor dashboards (top sellers, peak hours, demand forecasting)
  - Market reports (total sales, SNAP/incentive redemptions for grant reporting)
  - Community impact metrics (dollars kept in the local economy)
- **Privacy:** vendor sales data is private by default; only aggregated or anonymized data is shared publicly.

---

## 3. Additional Data Domains (Expansion)

| Domain | Description |
|---|---|
| **Sustainability Metrics** | Estimated food miles, CO₂e savings vs. conventional supply chains, packaging waste avoided, and food waste diverted. |
| **Events & Community** | Cooking demos, live music, kids' activities, workshops, and seed swaps. |
| **Amenities** | Restrooms, seating, parking, bike racks, composting/recycling stations, and reusable-bag drop-off. |
| **Reviews & Ratings** | Ratings for markets and vendors, with moderation tools. |
| **Weather** | Forecast integration so users know about closures and vendors can plan inventory. |
| **Food Recovery** | Partnerships with food banks, gleaning groups, and composting services. |
| **Language & Accessibility** | Languages spoken by vendors and staff, and accessibility features of each site. |

---

## 4. Sustainability & Incentive System

This is what makes the platform more than a directory: it rewards both consumers and sellers for sustainable behavior.

### 4.1 For Consumers
- **Impact tracking:** a personal dashboard showing local dollars spent, estimated food miles and CO₂e saved, and plastic avoided.
- **Rewards / points:** earn points for shopping locally, bringing reusable bags/containers, buying in-season or "ugly" produce, buying end-of-day surplus, and walking/biking/taking transit to the market.
- **Redemption:** points can be redeemed for market tokens, vendor discounts, or donations to food-access programs.
- **Gamification:** streaks, seasonal challenges ("try 10 new local vegetables this summer"), badges, and community goals.

### 4.2 For Vendors / Sellers
- **Sustainability score:** a clear score built from verified practices (certifications, packaging, food miles, waste diversion, benefit-program acceptance).
- **Visibility boosts:** higher-scoring vendors rank higher in search and earn "Sustainable Seller" badges.
- **Lower costs:** market managers can offer reduced stall fees for sustainable vendors or those accepting SNAP/WIC.
- **Demand signals:** pre-orders and demand forecasts help vendors bring the right amount and waste less.
- **Surplus channel:** a built-in way to sell or donate leftovers instead of throwing them away.
- **Grants & resources:** links to relevant grants (USDA FMPP, LFPP, GusNIP, EQIP) and technical assistance.

### 4.3 Integrity
- Verification for self-reported claims (certificate upload, manager approval, periodic audits).
- Anti-fraud controls on rewards (rate limits, transaction verification, receipt/QR scanning).
- A public, transparent scoring method so vendors know how to improve.

---

## 5. Users & Roles

| Role | Capabilities |
|---|---|
| **Guest** | Browse map, search markets/products, filter by schedule/payment/programs. |
| **Consumer (registered)** | Favorites, shopping lists, pre-orders, reviews, rewards, impact dashboard, notifications. |
| **Vendor** | Manage profile, products, prices, inventory, markets attended, pre-orders, sales dashboard, sustainability profile. |
| **Market Manager** | Manage market info and schedules, approve vendors, stall maps, announcements, program participation, market-level reports. |
| **Admin** | Data moderation, verification, import pipelines, user management, analytics. |
| **Partner / Researcher** (optional) | Read-only access to anonymized, aggregated datasets via API. |

---

## 6. Functional Requirements

### Consumers
- [ ] Map and list views of markets with search and filters (location, open now, products, payment methods, food-access programs, sustainability attributes)
- [ ] Market detail pages (schedule, vendors, products, amenities, programs, directions)
- [ ] Vendor detail pages (products, prices, practices, markets attended)
- [ ] Product search across all vendors/markets
- [ ] Seasonal produce guide
- [ ] Favorites, shopping lists, and notifications (market opening, product availability, closures)
- [ ] Pre-order and pickup flow
- [ ] Rewards and personal impact dashboard
- [ ] Benefits guide and calculator

### Vendors
- [ ] Onboarding and profile management
- [ ] Product catalog, pricing, and inventory updates (fast, mobile-friendly, ideally usable at the stall)
- [ ] Market attendance calendar
- [ ] Order management for pre-orders
- [ ] Sales and demand analytics
- [ ] Sustainability self-assessment and verification uploads
- [ ] Surplus/donation listings

### Market Managers
- [ ] Market profile and schedule management (including one-off closures)
- [ ] Vendor application and approval workflow
- [ ] Stall layout and assignment
- [ ] Program participation (SNAP, WIC, incentives) and redemption reporting
- [ ] Announcements and event posting

### Data & Admin
- [ ] Bulk import from public data sources (see Section 8)
- [ ] De-duplication and data quality checks (geocoding validation, stale-record flags)
- [ ] Crowd-sourced corrections with a moderation queue
- [ ] Public API for read access to non-sensitive data

---

## 7. Non-Functional Requirements

- **Mobile-first:** most consumers and vendors will use the platform on phones, often outdoors with weak signal; support offline caching / PWA.
- **Accessibility:** WCAG 2.1 AA compliance, screen-reader support, high-contrast mode.
- **Localization:** multilingual UI (at minimum English and Spanish; expand based on community needs).
- **Performance:** map and search results in under 2 seconds on a 4G connection.
- **Privacy & security:** minimal data collection; encrypted storage of personal data; no sale of user data; benefit usage is never exposed. Follow applicable laws (CCPA, state privacy laws) and the USDA FNS rules on SNAP retailer data.
- **Payments compliance:** use PCI-DSS compliant processors; SNAP/EBT online processing requires FNS authorization and an approved third-party processor.
- **Data freshness:** schedules and prices show a "last updated" timestamp; stale data is flagged automatically.
- **Scalability:** start at a city/region level and design the data model to scale nationally.
- **Reliability:** graceful degradation if third-party services (maps, weather, payments) are unavailable.

---

## 8. Data Sources & Collection

| Source | Data Provided |
|---|---|
| [USDA AMS National Farmers Market Directory / Local Food Directories](https://www.usdalocalfoodportal.com/) | Market locations, schedules, products, payment methods, programs |
| USDA FNS SNAP Retailer Locator | SNAP-authorized farmers markets and direct marketing farmers |
| USDA Food Access Research Atlas | Low-income / low-access census tracts |
| USDA NASS (Census of Agriculture, Quick Stats) | Regional farm and production data |
| USDA AMS Market News | Wholesale and retail price benchmarks |
| State agriculture departments & market associations | Regional market listings, certified market lists |
| Fair Food Network / Double Up Food Bucks | Incentive program participation |
| Vendor & manager self-reporting | Products, prices, inventory, practices |
| Crowd-sourcing | Corrections, photos, prices, reviews |
| Open data (OpenStreetMap, Census/ACS) | Geocoding, demographics, transit |

**Collection pipeline:** ingest → normalize (units, categories, addresses) → geocode → de-duplicate → validate → publish, with a scheduled refresh and change history.

---

## 9. Proposed Data Model (High Level)

```
Market ─┬─< MarketSchedule
        ├─< MarketVendor >── Vendor ─┬─< VendorProduct >── Product ── ProductCategory
        ├─< MarketPaymentMethod      ├─< VendorPaymentMethod
        ├─< MarketProgram >── Program├─< VendorCertification
        ├─< Event                    ├─< SustainabilityProfile
        └─< Amenity                  └─< Inventory / Price (time series)

User ─┬─< Favorite
      ├─< Order ──< OrderItem >── VendorProduct
      ├─< RewardTransaction
      └─< Review

Sale (aggregated) ── Vendor, Market, Product, PaymentMethod, Date
```

**Key entities**

- `Market`: id, name, address, geo (point), location_type, indoor_outdoor, website, contact, manager_id
- `MarketSchedule`: market_id, season_start, season_end, rrule, open_time, close_time, exceptions
- `Vendor`: id, name, description, farm_geo, contact, sustainability_score
- `Product` / `ProductCategory`: standardized taxonomy with attributes
- `Price`: vendor_product_id, unit, amount, observed_at, source
- `Program`: id, name (SNAP, WIC FMNP, Double Up, …), match_rate, cap, description
- `PaymentMethod`: id, name, type
- `Sale`: vendor_id, market_id, date, product_category, amount, transactions, payment_method, program
- `RewardTransaction`: user_id, action, points, verified_by, created_at

---

## 10. Suggested Tech Stack (Flexible)

| Layer | Options |
|---|---|
| Frontend (web) | React / Next.js, Tailwind CSS |
| Mobile | React Native / Expo, or a PWA |
| Maps | Mapbox GL, Leaflet + OpenStreetMap, or Google Maps |
| Backend / API | Node.js (Express/NestJS) or Python (FastAPI/Django) |
| Database | PostgreSQL + PostGIS (geospatial queries) |
| Auth & storage | Supabase / Firebase / Auth0 |
| Search | PostgreSQL full-text search, Meilisearch, or Algolia |
| Payments | Stripe / Square (cards); FNS-approved processor for SNAP/EBT |
| Analytics | Metabase / Superset dashboards; scheduled ETL jobs |
| Hosting | Vercel / Netlify (frontend), Render / Fly.io / AWS (backend) |

---

## 11. Hackathon MVP Scope

A realistic first version to build quickly:

1. **Import** USDA farmers market data for one region (e.g., Massachusetts / Greater Boston) into PostgreSQL + PostGIS.
2. **Map + list view** with filters: open now, products, payment methods, SNAP/WIC/HIP acceptance.
3. **Market & vendor detail pages** with schedules, products, and sample prices.
4. **Vendor portal (basic):** sign up, edit products and prices, mark attendance.
5. **Sustainability score v1:** based on a small set of self-reported practices and food miles.
6. **Consumer rewards v1:** check-in at a market (QR code) to earn points, plus a simple impact dashboard.

**Stretch goals:** pre-orders, surplus listings, a benefits calculator, multilingual UI, demand forecasting, and seasonal recipe suggestions.

---

## 12. Success Metrics

- Number of markets and vendors listed, and how fresh their data is
- Monthly active consumers and repeat visits
- Pre-orders / transactions facilitated
- SNAP/WIC/incentive dollars redeemed through listed markets
- Estimated CO₂e and food waste avoided
- Vendor revenue growth and retention
- Share of users in low-income / low-access areas

---

## 13. Open Questions

- How will vendor-reported sustainability claims be verified at scale?
- Who funds the rewards (markets, grants, sponsors, vendor fees)?
- Will the platform process payments directly, or only link out to existing systems?
- How do we keep data fresh when many small vendors have limited time or tech access?
- What data-sharing agreements are needed with markets and program administrators?

---

## 14. Contributing

1. Fork the repo and create a feature branch.
2. Follow the data model and naming conventions above.
3. Open a pull request with a clear description of the change.

## License

TBD (e.g., MIT for code; open data licenses such as ODbL for contributed datasets).
