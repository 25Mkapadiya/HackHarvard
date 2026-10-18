# Phase 12 transport audit

Starting remote feature head: 6e8d1586. Clean tree; fetched feature branch matched.
Main and deployment settings are outside scope.

Existing `quantityKg`, `foodMilesSummary` and `transportSummary` already implement
mass conversions, kg-mile and mass-weighted differences, freight mode factors,
negative results and partial-basket handling. Feed their existing evidence maps;
do not rewrite formulas or combine results with the historical adapter.

`PurchaseWorkspace` owns recorded visits and the existing opt-in Syracuse view.
`SustainabilityDashboard` owns recorded counts/spending and evidence cards. Add a
separate illustrative regional section without changing repository operations,
purchase inputs, existing observed evidence or historical selection behavior.
No new LCA evidence, consumer travel, local attribution or farm emissions.

Keep four concepts distinct: observed documented routes; published historical
comparisons; conditional regional models; unknown actual purchase origins. Market
coordinates locate destinations only, never producers. Production and calendar
facts can constrain model alternatives, but cannot establish sourcing shares or
an actual transport route/mode. Exactly matching geography/product/date/mass is
necessary for lookup, not proof of individual purchase applicability.

Research gate: source and date every agricultural fact, geometric endpoint and
mode assumption. Prefer published transport lanes. If only public geographic
reference points are usable, any distance must remain explicitly straight-line,
not road mileage. Such scenarios are a coarse geometric freight proxy, not a
measured route or measured emissions. No emissions claim about farmers-market
savings follows. Unsupported products, units, seasons, regions and expired models
must remain unavailable. Multiple origin alternatives must remain separate.

Preserved: seasonal and community reporting features, purchase validation/storage,
six existing calculation modules, environmental adapters/catalog, rewards, auth,
accounts, profiles, social features, dependencies and deployment configuration.
