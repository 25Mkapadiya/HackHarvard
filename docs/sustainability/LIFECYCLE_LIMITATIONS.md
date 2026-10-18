# Phase 7 life-cycle evidence decision

No matched life-cycle data is integrated. The existing formulas and required
boundaries are preserved.

The [USDA ERS ERR-99 study](https://www.ers.usda.gov/publications/46407) supplies
historical distance/vehicle case evidence, not a paired agricultural production,
land-use, well-to-wheel freight, processing/storage/packaging/retail LCA dataset.
Its miles and fuel calculations cannot supply missing production emissions.
The existing [EPA freight factors](https://www.epa.gov/system/files/documents/2025-01/ghg-emission-factors-hub-2025.pdf)
are combustion factors and cannot fill the life-cycle well-to-wheel freight slot.

[Poore and Nemecek (2018)](https://doi.org/10.1126/science.aaq0216) provides
important product-level background, but a generic apple footprint cannot identify
the studied growers, establish a current NY-versus-WA pair, or establish a
specific market purchase's emissions. No source-specific farm practices or
missing LCA stages are invented. No aggregate total is inserted into a component.

A future adapter must provide both scenarios with the same product, as-purchased
kg, cradle-to-retail boundary, mass allocation and AR5 100-year GWP. Stages must
be mutually exclusive and tagged as production+land use, well-to-wheel freight,
and other supply-chain emissions excluding those two components. It must also
document geography, validity dates and source rights. The catalog schema reuses
`LifecycleComparison`; incompatible boundaries/stages fail validation. Presence
of a URL is not verification: a new dataset needs a source audit before shipping.

The dashboard therefore keeps total life-cycle CO2e unavailable. It never adds
the separately displayed transportation result to an aggregate LCA footprint.
Farm refinement fields remain evidence attachments only; no certification or
practice multiplier has been introduced. See DATA_SOURCES.md for other reviewed
candidates and the distinction between source observation dates and scenario use.
