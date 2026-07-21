# Changelog

## [3.0.8](https://github.com/Endika/EventSplit/compare/v3.0.7...v3.0.8) (2026-07-21)


### Chores

* **deps-dev:** bump @testing-library/jest-dom from 6.9.1 to 7.0.0 ([e7eaa46](https://github.com/Endika/EventSplit/commit/e7eaa46a2964e34b73c4172860c5cf8cfca46b48))
* **deps:** bump the npm-minor-patch group with 10 updates ([4db7caa](https://github.com/Endika/EventSplit/commit/4db7caa8b4521b3144513ecbc18500ba153a28e5))
* **deps:** bump the npm-minor-patch group with 12 updates ([5097769](https://github.com/Endika/EventSplit/commit/509776990c327a8b682655d0229e2cfd771328bc))

## [3.0.7](https://github.com/Endika/EventSplit/compare/v3.0.6...v3.0.7) (2026-07-13)


### Bug Fixes

* prevent accidental pinch and double-tap zoom on mobile ([2186d26](https://github.com/Endika/EventSplit/commit/2186d265facd2824b0723324659fb58ce23ac857))

## [3.0.6](https://github.com/Endika/EventSplit/compare/v3.0.5...v3.0.6) (2026-07-07)


### Chores

* **deps:** bump the npm-minor-patch group with 13 updates ([0ca0477](https://github.com/Endika/EventSplit/commit/0ca04778aaae3f9429e7f787fc497d3668236a5f))
* **deps:** sync package-lock.json with bumped dependencies ([88677b9](https://github.com/Endika/EventSplit/commit/88677b9e300f10244c57df668843e04a83b15ba0))

## [3.0.5](https://github.com/Endika/EventSplit/compare/v3.0.4...v3.0.5) (2026-07-06)


### Chores

* **ci:** drop redundant deploy dispatch from release flow ([e1f6f87](https://github.com/Endika/EventSplit/commit/e1f6f87e1d90db023a327b164a49253701a4572d))

## [3.0.4](https://github.com/Endika/EventSplit/compare/v3.0.3...v3.0.4) (2026-07-06)


### Bug Fixes

* **ci:** stop release-please auto-merge loop ([ff6654e](https://github.com/Endika/EventSplit/commit/ff6654ed270febe5957edeb0affe0d86f02b3921))

## [3.0.3](https://github.com/Endika/EventSplit/compare/v3.0.2...v3.0.3) (2026-07-06)


### Chores

* **deps-dev:** bump @types/node from 25.9.3 to 26.0.1 ([18921cc](https://github.com/Endika/EventSplit/commit/18921cc105c8e3b7318fd7cc65046d4790fcfea9))
* **deps-dev:** bump the npm-minor-patch group with 5 updates ([b5f4642](https://github.com/Endika/EventSplit/commit/b5f46429b0c733b0b8c03144f3555f86ab873917))
* **deps:** bump the npm-minor-patch group with 13 updates ([c86fb29](https://github.com/Endika/EventSplit/commit/c86fb291a5474f9fee7c93080b51cc1ba63d6bb9))
* **deps:** bump the npm-minor-patch group with 14 updates ([8c68e38](https://github.com/Endika/EventSplit/commit/8c68e38b5046a6d770460796d8d83f0a4832996d))

## [3.0.2](https://github.com/Endika/EventSplit/compare/v3.0.1...v3.0.2) (2026-06-09)


### Chores

* **deps:** bump the npm-minor-patch group with 6 updates ([24d97be](https://github.com/Endika/EventSplit/commit/24d97beab0eb74052a59d612fac9f32470d4d36d))

## [3.0.1](https://github.com/Endika/EventSplit/compare/v3.0.0...v3.0.1) (2026-06-08)


### Bug Fixes

* **db:** widen edit_pin to text for the 64-char pin hash ([920e9c5](https://github.com/Endika/EventSplit/commit/920e9c5f2642a497ba122f4531da40696c20a877))

## [3.0.0](https://github.com/Endika/EventSplit/compare/v2.10.0...v3.0.0) (2026-06-08)


### ⚠ BREAKING CHANGES

* **security:** gate DB access via RPCs with server-side PIN

### Features

* **security:** gate DB access via RPCs with server-side PIN ([678cb40](https://github.com/Endika/EventSplit/commit/678cb40eb9d98fdc8451cd5692a941576add2a6a))

## [2.10.0](https://github.com/Endika/EventSplit/compare/v2.9.5...v2.10.0) (2026-06-05)


### Features

* **expenses:** unify bought state and group product picker ([13082c4](https://github.com/Endika/EventSplit/commit/13082c4e7f99769a20d7ab03b60df7c9b9e6d665))


### Bug Fixes

* **expenses:** credit expense history to the operator ([5254872](https://github.com/Endika/EventSplit/commit/525487213f4873cc400dcf6673715fb52e8c5023))

## [2.9.5](https://github.com/Endika/EventSplit/compare/v2.9.4...v2.9.5) (2026-06-04)


### Bug Fixes

* **expenses:** spread rounding remainder across participants ([0fedc02](https://github.com/Endika/EventSplit/commit/0fedc0216a792930514b513c371c06ba81b2bb5c))

## [2.9.4](https://github.com/Endika/EventSplit/compare/v2.9.3...v2.9.4) (2026-06-04)


### Chores

* **deps-dev:** bump @commitlint/cli from 20.5.3 to 21.0.2 ([580d0f9](https://github.com/Endika/EventSplit/commit/580d0f97a4ff4f47f656c8158b4b400904724fce))
* **deps:** bump the npm-minor-patch group with 13 updates ([9709000](https://github.com/Endika/EventSplit/commit/9709000c6b6587279083439e616602c3c7e6542f))

## [2.9.3](https://github.com/Endika/EventSplit/compare/v2.9.2...v2.9.3) (2026-06-02)


### Bug Fixes

* **purchases:** filter purchases and expense items by my assignments ([e4d4132](https://github.com/Endika/EventSplit/commit/e4d4132e650a7b1516872dbe06703a827ca6e51b))

## [2.9.2](https://github.com/Endika/EventSplit/compare/v2.9.1...v2.9.2) (2026-06-02)


### Bug Fixes

* **expenses:** split selector as pills instead of checkboxes ([c7309ad](https://github.com/Endika/EventSplit/commit/c7309ad2abc70974e488d38deaf4e541742bc6d2))

## [2.9.1](https://github.com/Endika/EventSplit/compare/v2.9.0...v2.9.1) (2026-06-01)


### Bug Fixes

* **sync:** backoff on write contention + friendly save errors ([c8de0a8](https://github.com/Endika/EventSplit/commit/c8de0a8f2571c5149a46c5d98d1ccaeaeee8eb8c))

## [2.9.0](https://github.com/Endika/EventSplit/compare/v2.8.0...v2.9.0) (2026-06-01)


### Features

* **app:** add AddManualLiquidationHandler ([24f2291](https://github.com/Endika/EventSplit/commit/24f229158dbae864f56cca02bc8a8b097cfc807c))
* **app:** edit/delete/recover/toggle manual liquidations ([7bc5d38](https://github.com/Endika/EventSplit/commit/7bc5d382e6921b161d89cc2f9dee817a3127496c))
* **app:** register manual liquidation handlers in DI ([2e36353](https://github.com/Endika/EventSplit/commit/2e36353d867591c0dd1c9111d86c02ff9a8fd1d9))
* **domain:** add computeTripTotals ([c5b64ec](https://github.com/Endika/EventSplit/commit/c5b64ec17a96f7dc06fca8005c36c8f6d6773ab0))
* **domain:** add ManualLiquidation entity ([b7e2277](https://github.com/Endika/EventSplit/commit/b7e227771b43bc7adb074ad33071c4db13f23d94))
* **domain:** add ManualLiquidationSplitter ([478219d](https://github.com/Endika/EventSplit/commit/478219d0f0ae4ae9803d03a498a4b0bd38e7db32))
* **domain:** wire manualLiquidations into Event snapshot ([dcae05a](https://github.com/Endika/EventSplit/commit/dcae05a1f68dac2e3b8eedb08e9bb4b7ab677495))
* **persistence:** manualLiquidations schema + SCHEMA_VERSION 2 ([2713335](https://github.com/Endika/EventSplit/commit/2713335f41eabb546721b18608bd6811db7ebd12))
* **ui:** add general trip-totals summary ([7e9f00e](https://github.com/Endika/EventSplit/commit/7e9f00e2fd73a1485710716c78680f3a81fd9a17))
* **ui:** add manual liquidations section ([a8cab9c](https://github.com/Endika/EventSplit/commit/a8cab9c4eaa99f309d1ff9a0a029aa2164e2bee2))
* **ui:** warn on expense touching a settled transfer ([eb0a2d4](https://github.com/Endika/EventSplit/commit/eb0a2d4f2ef7a22ecd1540d71c123f859cda8831))


### Bug Fixes

* **liquidations:** history i18n, edit UI, validation, shape guard ([ecc1316](https://github.com/Endika/EventSplit/commit/ecc131672181541e72f64ed19bc3048a9b019664))

## [2.8.0](https://github.com/Endika/EventSplit/compare/v2.7.1...v2.8.0) (2026-05-30)


### Features

* **location:** address autocomplete, venue name and map ([a499fe2](https://github.com/Endika/EventSplit/commit/a499fe20326cca8f15b53298b49d5701883652cb))

## [2.7.1](https://github.com/Endika/EventSplit/compare/v2.7.0...v2.7.1) (2026-05-30)


### Bug Fixes

* **ui:** mobile-friendly forms, tap targets and inputs ([b43dc48](https://github.com/Endika/EventSplit/commit/b43dc480f5d99d5cf0a2819dc88ed0331c35eef6))

## [2.7.0](https://github.com/Endika/EventSplit/compare/v2.6.5...v2.7.0) (2026-05-30)


### Features

* **ui:** light/dark coral theme with toggle and new icon ([9d21fa9](https://github.com/Endika/EventSplit/commit/9d21fa9f5ed7d3dc6c630d9d4a3fbc6f14a7ce93))

## [2.6.5](https://github.com/Endika/EventSplit/compare/v2.6.4...v2.6.5) (2026-05-28)


### Bug Fixes

* **i18n:** pluralize units (1 lata vs 3 latas) ([fbde331](https://github.com/Endika/EventSplit/commit/fbde331966e0e4343694f1e78758c166d109d4e4))

## [2.6.4](https://github.com/Endika/EventSplit/compare/v2.6.3...v2.6.4) (2026-05-28)


### Bug Fixes

* **profile:** credit actual editor in profile-update history ([1cf2e7a](https://github.com/Endika/EventSplit/commit/1cf2e7a27b55ebbd7b373bb9f4a8b1c7ee12eae5))

## [2.6.3](https://github.com/Endika/EventSplit/compare/v2.6.2...v2.6.3) (2026-05-28)


### Bug Fixes

* **shopping:** respect group and subgroup order in share text ([8731e07](https://github.com/Endika/EventSplit/commit/8731e0737b39e0333f2902872022b8b5bdddf688))

## [2.6.2](https://github.com/Endika/EventSplit/compare/v2.6.1...v2.6.2) (2026-05-28)


### Bug Fixes

* **profile:** drop misleading unit-family totals from summary ([8b35a1c](https://github.com/Endika/EventSplit/commit/8b35a1cdf5b46795a1dd3d3070044fb122118c23))

## [2.6.1](https://github.com/Endika/EventSplit/compare/v2.6.0...v2.6.1) (2026-05-28)


### Bug Fixes

* **shopping:** clean assignee and show qty for shared units ([c898afb](https://github.com/Endika/EventSplit/commit/c898afb6e889e46c07715d59aa0f1aeec2e3f799))

## [2.6.0](https://github.com/Endika/EventSplit/compare/v2.5.4...v2.6.0) (2026-05-28)


### Features

* **i18n:** add share and consumption keys in 6 locales ([d755564](https://github.com/Endika/EventSplit/commit/d755564706d0777b57fb6bbbf05902b476e11c83))
* **profile:** add consumption summary formatter ([c52ed9b](https://github.com/Endika/EventSplit/commit/c52ed9b744cf669e4cc35e743ff69dba6a3d8352))
* **profile:** add ConsumptionSummary section ([20b488a](https://github.com/Endika/EventSplit/commit/20b488a5d9551a295656f8d72ef139d017b643a0))
* **profile:** show consumption summary in profile editor ([3966be7](https://github.com/Endika/EventSplit/commit/3966be73405d06a6f8644b02048bc749d638bf7f))
* **shopping:** add per-user consumption aggregator ([f9f8e3c](https://github.com/Endika/EventSplit/commit/f9f8e3c3d2a9bfaa0a16273806d12199ad1cd502))
* **shopping:** add ShareListModal component ([43ea16f](https://github.com/Endika/EventSplit/commit/43ea16fd41db5c43c32ea05d2d1bf4f3586a18de))
* **shopping:** add shopping list text formatter ([1d062d8](https://github.com/Endika/EventSplit/commit/1d062d8f41c0e6cb17daa0f33fb5f5bc9a066e25))
* **shopping:** add unit family classifier ([0f0fd44](https://github.com/Endika/EventSplit/commit/0f0fd4462e5d9afd7a66ed7f4931d2ad7dcfe25b))
* **shopping:** wire share button into purchases tab ([3a7f580](https://github.com/Endika/EventSplit/commit/3a7f580ed3358fa6a272d0ef0162e7277ad3dc00))


### Bug Fixes

* **shopping:** use i18next interpolation and displayUnit in formatter ([bba3199](https://github.com/Endika/EventSplit/commit/bba319934ae6f49acaa658fce53e714e375be31c))

## [2.5.4](https://github.com/Endika/EventSplit/compare/v2.5.3...v2.5.4) (2026-05-27)


### Bug Fixes

* clean dangling refs on user removal, guard NaN inputs, fill i18n ([e87c532](https://github.com/Endika/EventSplit/commit/e87c532c2477d7334f284f6172d2421072d24585))

## [2.5.3](https://github.com/Endika/EventSplit/compare/v2.5.2...v2.5.3) (2026-05-27)


### Bug Fixes

* **expenses:** drop misleading per-person average from summary ([9560add](https://github.com/Endika/EventSplit/commit/9560addbd2192220c22c686dfae9451087f7adaa))

## [2.5.2](https://github.com/Endika/EventSplit/compare/v2.5.1...v2.5.2) (2026-05-27)


### Bug Fixes

* resolve code-review findings across the app ([c9c0deb](https://github.com/Endika/EventSplit/commit/c9c0debedb3039656a4b8ed3961ef6ffddb78acc))

## [2.5.1](https://github.com/Endika/EventSplit/compare/v2.5.0...v2.5.1) (2026-05-27)


### Bug Fixes

* **persistence:** reject stale-client writes that wipe newer fields ([4ec5a7e](https://github.com/Endika/EventSplit/commit/4ec5a7ef6bb9aa450730e0b830d6a6f26600ee3d))
* **purchases:** self-heal subgroupOrder from live item subgroups ([dc1896a](https://github.com/Endika/EventSplit/commit/dc1896a9f20c7a62ea8a8ce94347293a18a0d116))

## [2.5.0](https://github.com/Endika/EventSplit/compare/v2.4.0...v2.5.0) (2026-05-27)


### Features

* **expenses:** show who is assigned to buy each item ([4216ecd](https://github.com/Endika/EventSplit/commit/4216ecdadeae3fb2954288e3963de2322c53c0eb))


### Bug Fixes

* **purchases:** name field first; subgroup requires a group ([d45797b](https://github.com/Endika/EventSplit/commit/d45797b494dc08c20aaef1b9098aa09c1bf03e52))

## [2.4.0](https://github.com/Endika/EventSplit/compare/v2.3.0...v2.4.0) (2026-05-27)


### Features

* **purchases:** two-level groups with reorderable subgroups ([458b366](https://github.com/Endika/EventSplit/commit/458b36693aebe2c76c596428dcaafeb78796f336))

## [2.3.0](https://github.com/Endika/EventSplit/compare/v2.2.0...v2.3.0) (2026-05-27)


### Features

* **purchases:** add bag, tray and grams units ([1b7f0e2](https://github.com/Endika/EventSplit/commit/1b7f0e20aa6bc6bcf3167be68852b11b0d3a1e70))

## [2.2.0](https://github.com/Endika/EventSplit/compare/v2.1.1...v2.2.0) (2026-05-27)


### Features

* **purchases:** allow 0.25-step consumer multipliers ([0f88e21](https://github.com/Endika/EventSplit/commit/0f88e21e3495fa1fdc1060d2f6d15f52b64ea886))

## [2.1.1](https://github.com/Endika/EventSplit/compare/v2.1.0...v2.1.1) (2026-05-27)


### Refactor

* **application:** extract withOptimisticRetry helper ([2d92002](https://github.com/Endika/EventSplit/commit/2d92002403ca33a546f6f839c3666ca21ee9a67f))
* **presentation:** drop cache writes superseded by setEvent ([58bae03](https://github.com/Endika/EventSplit/commit/58bae03afa5961bd7ef3026e89fd7e0810ab0b62))
* remove dead SetAvailabilityHandler and parse casts ([390bf85](https://github.com/Endika/EventSplit/commit/390bf8511313dfe912a7b857fffe68767f6853a8))

## [2.1.0](https://github.com/Endika/EventSplit/compare/v2.0.0...v2.1.0) (2026-05-27)


### Features

* **trash:** cap soft-deleted purchases and expenses at 5 per list ([475dd44](https://github.com/Endika/EventSplit/commit/475dd441c98b88b17e170296bf67ec11efc9e784))


### Performance

* **sync:** broadcast version-only and version-gate snapshot fetches ([570f86e](https://github.com/Endika/EventSplit/commit/570f86e7439067617445826a2365ca730579a094))

## [2.0.0](https://github.com/Endika/EventSplit/compare/v1.54.3...v2.0.0) (2026-05-26)


### ⚠ BREAKING CHANGES

* **history:** the revert/undo feature is removed; history is now an audit log only.

### Features

* **history:** record audit-log entries only, remove revert ([75e9fdc](https://github.com/Endika/EventSplit/commit/75e9fdc4e8beb405fb777068597d5f2f29c7be66))


### Bug Fixes

* **i18n:** render EN/ES flags as inline SVG ([90bf97e](https://github.com/Endika/EventSplit/commit/90bf97ecb83df4941d2d5ce9fbe92e6105bf5099))


### Performance

* **history:** cap the audit log to the most recent 30 entries ([efd3643](https://github.com/Endika/EventSplit/commit/efd36430c864428cfdbe48a5f073b1e2f81f0939))

## [1.54.3](https://github.com/Endika/EventSplit/compare/v1.54.2...v1.54.3) (2026-05-26)


### Chores

* **deps-dev:** bump @commitlint/config-conventional ([173ce42](https://github.com/Endika/EventSplit/commit/173ce42af2afc33ce2b50862dbdf61d13a8262b9))

## [1.54.2](https://github.com/Endika/EventSplit/compare/v1.54.1...v1.54.2) (2026-05-26)


### Chores

* **deps-dev:** bump @types/node from 24.12.4 to 25.9.1 ([fe05830](https://github.com/Endika/EventSplit/commit/fe05830814f6c9eaaca569fb1d3c304fcf8a758c))

## [1.54.1](https://github.com/Endika/EventSplit/compare/v1.54.0...v1.54.1) (2026-05-26)


### Refactor

* derive enums from domain constants, dedupe units ([88ed02c](https://github.com/Endika/EventSplit/commit/88ed02c6112e426b615c3d832cc2dafe8c624097))

## [1.54.0](https://github.com/Endika/EventSplit/compare/v1.53.0...v1.54.0) (2026-05-26)


### Features

* **profile:** reveal allergy picker only on add click ([b371cba](https://github.com/Endika/EventSplit/commit/b371cba5772f890786809c61932ca738222dc582))

## [1.53.0](https://github.com/Endika/EventSplit/compare/v1.52.0...v1.53.0) (2026-05-26)


### Features

* **ui:** loading spinner on save and delete buttons ([a6ad585](https://github.com/Endika/EventSplit/commit/a6ad585b0ca7822a8eaf16931ccc4dfaf6f9694a))

## [1.52.0](https://github.com/Endika/EventSplit/compare/v1.51.0...v1.52.0) (2026-05-26)


### Features

* **purchases:** allergy/diet chips on consumers, fix bring label ([1545c58](https://github.com/Endika/EventSplit/commit/1545c583c7af3b0aeeac3e6a063fc0891f5f2acc))

## [1.51.0](https://github.com/Endika/EventSplit/compare/v1.50.1...v1.51.0) (2026-05-26)


### Features

* **app:** link expenses to purchased quantities ([3116070](https://github.com/Endika/EventSplit/commit/31160700237194e6a82c5a53b9f7b0a0fdd4f583))
* **domain:** expenses record purchased quantities ([af4e3ff](https://github.com/Endika/EventSplit/commit/af4e3ff1b89d7d01778a83b9fab046500e0f0291))
* **ui:** show purchased quantity progress in shopping list ([8110347](https://github.com/Endika/EventSplit/commit/81103478c45d830e64c80c20efc65e6379db4fbf))

## [1.50.1](https://github.com/Endika/EventSplit/compare/v1.50.0...v1.50.1) (2026-05-26)


### Chores

* **i18n:** simplify single unit label ([715fb6e](https://github.com/Endika/EventSplit/commit/715fb6eab13bbc8d62bab7c88f9c14d34f7bfa33))

## [1.50.0](https://github.com/Endika/EventSplit/compare/v1.49.0...v1.50.0) (2026-05-26)


### Features

* **purchases:** switch buy/bring when editing an item ([8e031e1](https://github.com/Endika/EventSplit/commit/8e031e1282843ae56179db99fa432edc9403576b))

## [1.49.0](https://github.com/Endika/EventSplit/compare/v1.48.0...v1.49.0) (2026-05-26)


### Features

* **purchases:** single shared unit with fixed quantity ([2e84736](https://github.com/Endika/EventSplit/commit/2e8473658068dc1f1ada44eaa85af95b7cb1ed69))

## [1.48.0](https://github.com/Endika/EventSplit/compare/v1.47.1...v1.48.0) (2026-05-26)


### Features

* **app:** handlers for bring-from-home items ([89a3006](https://github.com/Endika/EventSplit/commit/89a3006ca0ae1e4de9897bbcbaa54b417dd3c8c3))
* **domain:** add bring-from-home shopping items ([9b30299](https://github.com/Endika/EventSplit/commit/9b302996f62fc74d3250900cca35097f828259aa))
* **ui:** dual buy/bring selector in shopping list ([ff27c5e](https://github.com/Endika/EventSplit/commit/ff27c5ea67df37033def6594431dd81315f9b38d))

## [1.47.1](https://github.com/Endika/EventSplit/compare/v1.47.0...v1.47.1) (2026-05-26)


### Bug Fixes

* **forms:** accept comma or dot as decimal separator ([c11deee](https://github.com/Endika/EventSplit/commit/c11deeed09191df20aa4834214cf3c0f8ffc1467))

## [1.47.0](https://github.com/Endika/EventSplit/compare/v1.46.3...v1.47.0) (2026-05-26)


### Features

* **sync:** conflict notice toast and client write rate limit ([79ca82a](https://github.com/Endika/EventSplit/commit/79ca82a8706ffa73011be942c1749411f4e1e03d))

## [1.46.3](https://github.com/Endika/EventSplit/compare/v1.46.2...v1.46.3) (2026-05-26)


### Bug Fixes

* **allergy:** match allergen name and free-text note ([7dcf46d](https://github.com/Endika/EventSplit/commit/7dcf46d3d0e577d84c6ff44d59c8359b3e3f65e2))

## [1.46.2](https://github.com/Endika/EventSplit/compare/v1.46.1...v1.46.2) (2026-05-26)


### Bug Fixes

* **purchases:** drop empty groups from the saved order ([d491ba7](https://github.com/Endika/EventSplit/commit/d491ba70fd24401c5dd7627a4bfb39fe1abbcc8b))

## [1.46.1](https://github.com/Endika/EventSplit/compare/v1.46.0...v1.46.1) (2026-05-26)


### Refactor

* **purchases:** drop category, use group only ([6896f28](https://github.com/Endika/EventSplit/commit/6896f2847a4b410cc771e2f3eb5f6deb4496f3ca))

## [1.46.0](https://github.com/Endika/EventSplit/compare/v1.45.0...v1.46.0) (2026-05-26)


### Features

* **ui:** collapsible groups with item count, refetch on focus ([1cae96e](https://github.com/Endika/EventSplit/commit/1cae96ef22b08ad18b1259dca7a0f48ca0bdfdfb))

## [1.45.0](https://github.com/Endika/EventSplit/compare/v1.44.1...v1.45.0) (2026-05-26)


### Features

* **app:** add rename-group and set-group-order handlers ([35b0e6b](https://github.com/Endika/EventSplit/commit/35b0e6be0e5eb7a1fc0ac527302bb0c7b07c6b18))
* **domain:** rename and order shopping groups ([349e5f5](https://github.com/Endika/EventSplit/commit/349e5f547c1c28846f7faf9957f85765629b5ef7))
* **ui:** rename and reorder shopping groups ([b242973](https://github.com/Endika/EventSplit/commit/b242973b767ae7fb1fe5322352cda1f5d52648d7))

## [1.44.1](https://github.com/Endika/EventSplit/compare/v1.44.0...v1.44.1) (2026-05-26)


### Bug Fixes

* **ui:** prevent pull-to-refresh from reloading and losing form ([de809ac](https://github.com/Endika/EventSplit/commit/de809ac221d95cf4452544a6682726b40e05a44d))

## [1.44.0](https://github.com/Endika/EventSplit/compare/v1.43.1...v1.44.0) (2026-05-26)


### Features

* **app:** pass group through purchase handlers ([e3c61d9](https://github.com/Endika/EventSplit/commit/e3c61d93243f6ae076120f72f5f88ad3225ac4f4))
* **domain:** add optional group to purchases ([5258773](https://github.com/Endika/EventSplit/commit/5258773e07e75c76b0d1dde2a8b06cb87632d4ba))
* **ui:** group shopping list by tags ([f78d451](https://github.com/Endika/EventSplit/commit/f78d45149c657f5a6c7da0a5393d3fa32e08639b))

## [1.43.1](https://github.com/Endika/EventSplit/compare/v1.43.0...v1.43.1) (2026-05-26)


### Bug Fixes

* round total quantity consistently in domain and lists ([7699c42](https://github.com/Endika/EventSplit/commit/7699c4214742cb8207d1dee5b0930f9d449c3a2d))

## [1.43.0](https://github.com/Endika/EventSplit/compare/v1.42.0...v1.43.0) (2026-05-26)


### Features

* **app:** edit expense can mark or unmark bought items ([51780ec](https://github.com/Endika/EventSplit/commit/51780ec48401f5e0e378548115ab912e6ae143c6))
* **ui:** toggle bought list items when editing an expense ([836720c](https://github.com/Endika/EventSplit/commit/836720c9d92f82452afe602558a199077f7f4f4b))

## [1.42.0](https://github.com/Endika/EventSplit/compare/v1.41.0...v1.42.0) (2026-05-26)


### Features

* **ui:** allow any decimal for daily consumption ([7fa1cdc](https://github.com/Endika/EventSplit/commit/7fa1cdce681c9f6fcae423405c52c767756d02b4))

## [1.41.0](https://github.com/Endika/EventSplit/compare/v1.40.0...v1.41.0) (2026-05-26)


### Features

* **domain:** track partial bought quantity on purchases ([ee041ba](https://github.com/Endika/EventSplit/commit/ee041ba695b6d3a496e9f7f7858b35eb4f470f46))
* **ui:** show estimated quantity in expense buy-list ([fced38d](https://github.com/Endika/EventSplit/commit/fced38d615a086c2f27f3092cdda14b4454b08c0))

## [1.40.0](https://github.com/Endika/EventSplit/compare/v1.39.0...v1.40.0) (2026-05-26)


### Features

* **app:** mark linked purchases bought when adding expense ([2875653](https://github.com/Endika/EventSplit/commit/287565383feb6716faea0371f7bb39ffce888c69))
* **ui:** pick list items to mark bought when adding expense ([2ef0d8e](https://github.com/Endika/EventSplit/commit/2ef0d8e0e00eafacbf81bf2ac00e90b44a1a7d24))

## [1.39.0](https://github.com/Endika/EventSplit/compare/v1.38.1...v1.39.0) (2026-05-26)


### Features

* **pwa:** add in-app install prompt for android and ios hint ([92b9d74](https://github.com/Endika/EventSplit/commit/92b9d745d294f646a46509cf500305499f672bee))

## [1.38.1](https://github.com/Endika/EventSplit/compare/v1.38.0...v1.38.1) (2026-05-26)


### Bug Fixes

* **pwa:** reference favicon and apple-touch-icon with base path ([6632ccc](https://github.com/Endika/EventSplit/commit/6632ccc26c11e2df253d5c076f4d96e290f574df))

## [1.38.0](https://github.com/Endika/EventSplit/compare/v1.37.0...v1.38.0) (2026-05-26)


### Features

* **i18n:** keep planning label for the first stage ([0de1ff5](https://github.com/Endika/EventSplit/commit/0de1ff544fa2f3eadbde966962d24c0932a365b8))

## [1.37.0](https://github.com/Endika/EventSplit/compare/v1.36.0...v1.37.0) (2026-05-26)


### Features

* **ui:** clearer stage names with explainer popup ([db8d6f6](https://github.com/Endika/EventSplit/commit/db8d6f6e22a6fb7877d1f834b61ec16368245736))

## [1.36.0](https://github.com/Endika/EventSplit/compare/v1.35.0...v1.36.0) (2026-05-26)


### Features

* **ui:** allow editing a participant name ([3f5fe23](https://github.com/Endika/EventSplit/commit/3f5fe23471b333ea2e998ae26ee8a7223f43531f))


### Bug Fixes

* **ui:** make modal and identification list scrollable ([6834f94](https://github.com/Endika/EventSplit/commit/6834f9453cb1f43ae21a78123b8c7652c22a8d3c))

## [1.35.0](https://github.com/Endika/EventSplit/compare/v1.34.0...v1.35.0) (2026-05-26)


### Features

* **app:** add toggle-settlement handler ([6b9c129](https://github.com/Endika/EventSplit/commit/6b9c12908031fc757a6b10be94ac159edb76840f))
* **domain:** track settled transfers on the event ([af74200](https://github.com/Endika/EventSplit/commit/af74200f3789746bc76c83a9f2b495726959c125))
* **ui:** mark settlement transfers as paid ([2416c2e](https://github.com/Endika/EventSplit/commit/2416c2e4234cb7e64ca7f17005bc46c38b85e5a4))

## [1.34.0](https://github.com/Endika/EventSplit/compare/v1.33.0...v1.34.0) (2026-05-26)


### Features

* **i18n:** reword pin copy for access gating ([1548ee8](https://github.com/Endika/EventSplit/commit/1548ee86696341ae8a247c5770a28e02b11591d3))
* **ui:** pin now gates event access not just edits ([95fee40](https://github.com/Endika/EventSplit/commit/95fee40220a9aee61feb54d12c4046fa091b4689))

## [1.33.0](https://github.com/Endika/EventSplit/compare/v1.32.0...v1.33.0) (2026-05-26)


### Features

* **ui:** restrict edit-pin management to event creator ([46fe73d](https://github.com/Endika/EventSplit/commit/46fe73d2b24187d0df7aad6e1617895647a4b1b9))
* **ui:** scroll to expense form, remount on switch, unsaved guard ([40565e3](https://github.com/Endika/EventSplit/commit/40565e30cf06b2693a28ca86c364db4f32b181f4))

## [1.32.0](https://github.com/Endika/EventSplit/compare/v1.31.0...v1.32.0) (2026-05-26)


### Features

* **ui:** add lock-device button and pin explanation ([fa95bdc](https://github.com/Endika/EventSplit/commit/fa95bdc381d4af93980f3cbd0607d7deac4cc798))
* **ui:** edit event name from details tab ([07c5d25](https://github.com/Endika/EventSplit/commit/07c5d25cd4377845d4eda88f99343a01dc600d34))

## [1.31.0](https://github.com/Endika/EventSplit/compare/v1.30.0...v1.31.0) (2026-05-26)


### Features

* **ui:** scroll to purchase form, remount on switch, unsaved guard ([73fe3f3](https://github.com/Endika/EventSplit/commit/73fe3f32ccd71543c5d5adff42528571afddac27))

## [1.30.0](https://github.com/Endika/EventSplit/compare/v1.29.1...v1.30.0) (2026-05-26)


### Features

* **ui:** manage edit-pin after event creation in details tab ([0aedaf2](https://github.com/Endika/EventSplit/commit/0aedaf28e2892a95b418a08771f4fa9ae7a06cff))

## [1.29.1](https://github.com/Endika/EventSplit/compare/v1.29.0...v1.29.1) (2026-05-26)


### Bug Fixes

* **ui:** confirm day removal and hide it when day has votes ([6f11d0d](https://github.com/Endika/EventSplit/commit/6f11d0d4f168f88e375890c03447a6da8b27a86f))

## [1.29.0](https://github.com/Endika/EventSplit/compare/v1.28.0...v1.29.0) (2026-05-26)


### Features

* **i18n:** add galician, catalan and valencian locales ([8df5520](https://github.com/Endika/EventSplit/commit/8df552010bb11290a71b4d9b322cbdbed5c39f34))
* **ui:** add galician, catalan, valencian to language switcher ([58f11f3](https://github.com/Endika/EventSplit/commit/58f11f34caf4ec9443124cb3f8f1b7b129dd7286))

## [1.28.0](https://github.com/Endika/EventSplit/compare/v1.27.0...v1.28.0) (2026-05-26)


### Features

* **ui:** doodle textarea, remove day, hide children toggle ([036fdfd](https://github.com/Endika/EventSplit/commit/036fdfd3724f05d7cb8116ac594dc89414eff5ec))

## [1.27.0](https://github.com/Endika/EventSplit/compare/v1.26.0...v1.27.0) (2026-05-26)


### Features

* **app:** add set-availability-meta handler ([dad2948](https://github.com/Endika/EventSplit/commit/dad2948ef7e224d9523ef02261d2c337b986ef1f))
* **domain:** add availability note and chosen day to event ([00d79ec](https://github.com/Endika/EventSplit/commit/00d79eca8fd9c084be35af5263d03b9599294194))
* **ui:** allergy notes field, especially for other ([87a8ea2](https://github.com/Endika/EventSplit/commit/87a8ea25dcc2c4107f728209ebbcbb8ba134e25c))
* **ui:** availability description and chosen day highlight ([f709750](https://github.com/Endika/EventSplit/commit/f70975076bc51a23a023c6fbf02c74e366a49250))

## [1.26.0](https://github.com/Endika/EventSplit/compare/v1.25.0...v1.26.0) (2026-05-26)


### Features

* **ui:** add flags to language switcher buttons ([e0af324](https://github.com/Endika/EventSplit/commit/e0af324de7ae01e91cc565932edf09022fc63d93))

## [1.25.0](https://github.com/Endika/EventSplit/compare/v1.24.0...v1.25.0) (2026-05-26)


### Features

* **app:** add recover handlers for purchase and expense ([93fc931](https://github.com/Endika/EventSplit/commit/93fc9319e32a94a90def3cbe34741454abd77f1d))
* **domain:** add recover to purchase and expense entities ([087fd21](https://github.com/Endika/EventSplit/commit/087fd21c8a6b60010610f7edb8a3a9337e14b54d))
* **ui:** show deleted items with restore button ([3fd534a](https://github.com/Endika/EventSplit/commit/3fd534a392abb37741ebebb367864d53f5e5ae2c))

## [1.24.0](https://github.com/Endika/EventSplit/compare/v1.23.0...v1.24.0) (2026-05-26)


### Features

* **ui:** exclude children from expense split by default ([699eb15](https://github.com/Endika/EventSplit/commit/699eb159df908578e718204da9a79951fc602334))

## [1.23.0](https://github.com/Endika/EventSplit/compare/v1.22.0...v1.23.0) (2026-05-26)


### Features

* **ui:** only list adults as purchase buyers ([d6f797a](https://github.com/Endika/EventSplit/commit/d6f797ad0dc1ca57db55a045435163784affdb49))

## [1.22.0](https://github.com/Endika/EventSplit/compare/v1.21.0...v1.22.0) (2026-05-26)


### Features

* **ui:** tap purchase or expense card to edit it ([4583a5a](https://github.com/Endika/EventSplit/commit/4583a5ad83fef03fd9d63b1cac6fcbabb15c7451))

## [1.21.0](https://github.com/Endika/EventSplit/compare/v1.20.1...v1.21.0) (2026-05-26)


### Features

* **i18n:** rename add-purchase button to add-to-list ([a475953](https://github.com/Endika/EventSplit/commit/a475953c83d0c84d4ab7bd8128193e2c8aa73625))

## [1.20.1](https://github.com/Endika/EventSplit/compare/v1.20.0...v1.20.1) (2026-05-26)


### Performance

* **ui:** code-split event page and tabs with react lazy ([5563e43](https://github.com/Endika/EventSplit/commit/5563e43a5258fadd72817dd129366e31801be496))

## [1.20.0](https://github.com/Endika/EventSplit/compare/v1.19.0...v1.20.0) (2026-05-26)


### Features

* **app:** add edit and delete expense handlers ([90a66e2](https://github.com/Endika/EventSplit/commit/90a66e2549fae71ca5aa65d4df36ea2f36a32322))
* **domain:** add edit and soft-delete to expense entity ([323b568](https://github.com/Endika/EventSplit/commit/323b56828f42f118da91bba9c01ce0394eb692be))
* **ui:** edit and delete expenses in list ([a94a009](https://github.com/Endika/EventSplit/commit/a94a0095c5b873d75da2b8ed48ddac32b3d17aae))

## [1.19.0](https://github.com/Endika/EventSplit/compare/v1.18.0...v1.19.0) (2026-05-26)


### Features

* **app:** add soft-delete purchase handler ([c5b49b5](https://github.com/Endika/EventSplit/commit/c5b49b5b142ac91cec639fac59e64367f0da165a))
* **ui:** assign buyer, mark bought, delete in purchase list ([eed0960](https://github.com/Endika/EventSplit/commit/eed096035bacea50225787dfae771e868cf43bfe))
* **ui:** doodle vote counts and rename shopping list tab ([4886d49](https://github.com/Endika/EventSplit/commit/4886d49fced115b40e708e6c06308abe9d63b24b))
* **ui:** editable item/category, free unit, assignee in form ([6ff0b5d](https://github.com/Endika/EventSplit/commit/6ff0b5ddcaf3d5e63cad8e04c835ba57626c623e))

## [1.18.0](https://github.com/Endika/EventSplit/compare/v1.17.0...v1.18.0) (2026-05-26)


### Features

* **app:** add assign-purchase handler for buyer and bought flag ([446a0f2](https://github.com/Endika/EventSplit/commit/446a0f2002803639a1e0fbfb263eeac1fe047331))
* **app:** edit item/category/unit and assign buyer on purchase ([f3d137e](https://github.com/Endika/EventSplit/commit/f3d137e1b9135b47cf3675ad92a01194b0f081f0))
* **domain:** free-text unit, editable fields, buyer assignment ([9653cfe](https://github.com/Endika/EventSplit/commit/9653cfe9e36ade38d3d5a4530da26a76b6a31072))

## [1.17.0](https://github.com/Endika/EventSplit/compare/v1.16.0...v1.17.0) (2026-05-26)


### Features

* **ui:** clearer purchase form with labels and live total ([09bb5b1](https://github.com/Endika/EventSplit/commit/09bb5b167c16b28c743af5d33da9eb2f72a95c0a))
* **ui:** default expense payer to current user ([b2ddf9a](https://github.com/Endika/EventSplit/commit/b2ddf9a18a70d9a42e2fb48f8b213c63db94473a))

## [1.16.0](https://github.com/Endika/EventSplit/compare/v1.15.0...v1.16.0) (2026-05-26)


### Features

* **app:** add batch availability handler for multiple users ([b75972d](https://github.com/Endika/EventSplit/commit/b75972d1e41d619346a9cf6a7438e1622413a76f))
* **ui:** edit availability for any participant in matrix ([84eac26](https://github.com/Endika/EventSplit/commit/84eac2698ff924a607d14fc8670886ed20a09520))

## [1.15.0](https://github.com/Endika/EventSplit/compare/v1.14.2...v1.15.0) (2026-05-26)


### Features

* **ui:** swipe between tabs on mobile with position dots ([dffbe0a](https://github.com/Endika/EventSplit/commit/dffbe0a27dfd1fa006c0de984e671c02c16dba28))

## [1.14.2](https://github.com/Endika/EventSplit/compare/v1.14.1...v1.14.2) (2026-05-26)


### Bug Fixes

* **pwa:** use prompt mode with periodic update checks ([b621a4a](https://github.com/Endika/EventSplit/commit/b621a4a1d82457ca51ffb0a5cdd021030fd954ea))

## [1.14.1](https://github.com/Endika/EventSplit/compare/v1.14.0...v1.14.1) (2026-05-26)


### Bug Fixes

* **ui:** stabilize context setters to stop event-load render loop ([d723dc9](https://github.com/Endika/EventSplit/commit/d723dc9274786c5a5e248d928061ae2f07c03970))

## [1.14.0](https://github.com/Endika/EventSplit/compare/v1.13.0...v1.14.0) (2026-05-26)


### Features

* **ui:** add global on-screen error banner with copy ([1eb3b6d](https://github.com/Endika/EventSplit/commit/1eb3b6d7930ccd1db75299659fc14173227c878e))


### Chores

* **ui:** route write errors to global error banner ([c3d770d](https://github.com/Endika/EventSplit/commit/c3d770d253ea8eedea91e45d7d71bd77dd9c1285))

## [1.13.0](https://github.com/Endika/EventSplit/compare/v1.12.0...v1.13.0) (2026-05-26)


### Features

* **app:** add edit-purchase handler with optimistic lock ([ffa5169](https://github.com/Endika/EventSplit/commit/ffa5169394693172677fa686f84cef7c9f9caf18))
* **app:** add remove-participant handler with retry ([1332f85](https://github.com/Endika/EventSplit/commit/1332f85efd043721c0fadd6b80ba79f25d673972))
* **app:** add set-event-stage handler with no-op detection ([5dc9ef0](https://github.com/Endika/EventSplit/commit/5dc9ef005d95a656cd81cb25bbf240efb1624836))
* **domain:** add edit method to purchase entity ([0a5ab5e](https://github.com/Endika/EventSplit/commit/0a5ab5eed9028f551ce7ad2c269639031a871069))
* **domain:** add event lifecycle stage field and transition ([33b227b](https://github.com/Endika/EventSplit/commit/33b227b4062a304fb690728fc27a4fa9ae98699f))
* **domain:** add remove-user with reference cleanup ([94409a3](https://github.com/Endika/EventSplit/commit/94409a3dad09dafb2ef4850042245932a9350ae1))
* **ui:** edit any participant and remove from event ([a1dc8aa](https://github.com/Endika/EventSplit/commit/a1dc8aa4f0ec985415f615d0a89801fbaba2b10b))
* **ui:** edit existing purchases inline from list ([a62d603](https://github.com/Endika/EventSplit/commit/a62d60339aba63a1799808257e5935671ebdb589))
* **ui:** event stages with default tab per stage ([d87058e](https://github.com/Endika/EventSplit/commit/d87058e4896961174023601c89e14f82a3a18324))


### Chores

* trigger ci ([cced461](https://github.com/Endika/EventSplit/commit/cced46198ed37ccd847fe50a6250e822dde43362))

## [1.12.0](https://github.com/Endika/EventSplit/compare/v1.11.0...v1.12.0) (2026-05-26)


### Features

* **infra:** validate jsonb event snapshots via zod schema ([f2141ee](https://github.com/Endika/EventSplit/commit/f2141eeaaf13c1668459812d85cc03c4ca5799fb))
* **ui:** allow switching participant identity per device ([9ce0c1f](https://github.com/Endika/EventSplit/commit/9ce0c1fa5f17929c8023ba1c8ad5b333f9684a66))


### Bug Fixes

* **ui:** show detailed error info in add-participant modal ([3436304](https://github.com/Endika/EventSplit/commit/34363041d1d78626bb6026fa8ece404f330763ec))

## [1.11.0](https://github.com/Endika/EventSplit/compare/v1.10.0...v1.11.0) (2026-05-26)


### Features

* **app:** pass split-among to expense handler with validation ([8a15066](https://github.com/Endika/EventSplit/commit/8a15066d6c37e8e8be72ec542888b0b683554476))
* **domain:** support per-expense split among subset of users ([bed1d78](https://github.com/Endika/EventSplit/commit/bed1d780360e3f450e92df75cdb78f8932f075ba))
* **ui:** allow selecting who an expense is split between ([aaf042e](https://github.com/Endika/EventSplit/commit/aaf042ea98ecbd387a0e65a02f2439caf1710476))

## [1.10.0](https://github.com/Endika/EventSplit/compare/v1.9.0...v1.10.0) (2026-05-26)


### Features

* **i18n:** translate purchase categories and units ([d11f34a](https://github.com/Endika/EventSplit/commit/d11f34a3e904873d7884f8fba1c6a795c2d4651f))
* **ui:** add share event button with web share fallback ([385cd5f](https://github.com/Endika/EventSplit/commit/385cd5ffa809e9010c2cb49be0c248b883c0fa34))


### Chores

* **ui:** log write errors to console for diagnostics ([4d65868](https://github.com/Endika/EventSplit/commit/4d65868b7de8e53f39228b4dcdcbde92093089be))

## [1.9.0](https://github.com/Endika/EventSplit/compare/v1.8.0...v1.9.0) (2026-05-26)


### Features

* **domain:** add adult child kind to user entity ([21d4646](https://github.com/Endika/EventSplit/commit/21d4646e039751cbf89c47caa60bf047a20c9948))
* **ui:** add participant modal and kind selector ([ab8271b](https://github.com/Endika/EventSplit/commit/ab8271bbb9cf6422b7d2422f05486324c2fca1a7))
* **ui:** default purchase multiplier by participant kind ([f1c8e78](https://github.com/Endika/EventSplit/commit/f1c8e783eae6563fc18ad827a6952e83ffce3551))

## [1.8.0](https://github.com/Endika/EventSplit/compare/v1.7.0...v1.8.0) (2026-05-26)


### Features

* **ui:** collapsible create form when home has recent events ([69c3841](https://github.com/Endika/EventSplit/commit/69c38415e6d27705362c845d1aae8c489b62deac))

## [1.7.0](https://github.com/Endika/EventSplit/compare/v1.6.0...v1.7.0) (2026-05-26)


### Features

* **ui:** add language switcher in footer ([d7bf2a0](https://github.com/Endika/EventSplit/commit/d7bf2a0129576ac963ac66c76f2039e10b859dec))


### Bug Fixes

* **domain:** backfill missing fields when restoring legacy events ([7f4beb8](https://github.com/Endika/EventSplit/commit/7f4beb8cf31dbcfbf50cab5130700eb6b27e7cb6))

## [1.6.0](https://github.com/Endika/EventSplit/compare/v1.5.0...v1.6.0) (2026-05-26)


### Features

* **ui:** responsive layout with mobile side menu and safe areas ([b2c1753](https://github.com/Endika/EventSplit/commit/b2c175385b5e918dba6bbef98c4647126f7cb8d7))

## [1.5.0](https://github.com/Endika/EventSplit/compare/v1.4.0...v1.5.0) (2026-05-26)


### Features

* **ui:** show recent events on home screen ([bb28697](https://github.com/Endika/EventSplit/commit/bb28697c9bd5141e5af33b808f7382cd722a6d6a))

## [1.4.0](https://github.com/Endika/EventSplit/compare/v1.3.0...v1.4.0) (2026-05-26)


### Features

* **app:** add set-edit-pin handler with hashed pin storage ([fc6cbc1](https://github.com/Endika/EventSplit/commit/fc6cbc1e5f08595bff47250bf6f7dc050f2e4412))
* **domain:** add edit-pin value object with sha-256 hashing ([87734e9](https://github.com/Endika/EventSplit/commit/87734e989a997573fbe2a7eeeb06fc60d9bcc17e))
* **domain:** add revert handler with full-state snapshots ([3d9cb9c](https://github.com/Endika/EventSplit/commit/3d9cb9cb7bdd48279bddbc7f3e4a62c2b0feee77))
* **ui:** add diff viewer with redacted sensitive fields ([fe4c4b8](https://github.com/Endika/EventSplit/commit/fe4c4b8367d916209f4d86a95744f8ad2b3381c9))
* **ui:** add edit-pin field on create and write-guard scaffold ([2bf8b3e](https://github.com/Endika/EventSplit/commit/2bf8b3e20e7aabe2bafc3f139ef170f42d63ab61))
* **ui:** add history tab with chronological entries ([dca19a5](https://github.com/Endika/EventSplit/commit/dca19a5cbb30bbd2308b58a6bd8872d2dc86dcc5))
* **ui:** add revert confirmation flow from diff viewer ([00c7b7e](https://github.com/Endika/EventSplit/commit/00c7b7e21f698624abe4aba863a2404a9541729b))
* **ui:** gate all write forms with edit-pin verification ([e9bcd9a](https://github.com/Endika/EventSplit/commit/e9bcd9ac221df907bdd8d437d9251bb4acf1ad99))
* **ui:** wire history tab in event navigation ([61f6850](https://github.com/Endika/EventSplit/commit/61f68500af4b64d9d665204e1485221e24a9e9b2))

## [1.3.0](https://github.com/Endika/EventSplit/compare/v1.2.0...v1.3.0) (2026-05-26)


### Features

* **app:** add edit-event-details handler with maps url ([8810ea1](https://github.com/Endika/EventSplit/commit/8810ea1c8088867a7eaae6f4af9c0654fdfb2543))
* **app:** add set-availability handler with length check ([6ae2e73](https://github.com/Endika/EventSplit/commit/6ae2e73427b93f054f1f1e55377e6eec736823cd))
* **app:** add set-event-days handler with availability re-align ([30d2fe0](https://github.com/Endika/EventSplit/commit/30d2fe0898ea0833ee9cd24a8cd0e494010dd18d))
* **app:** add update-profile handler with allergies ([da8f911](https://github.com/Endika/EventSplit/commit/da8f911049c9e596061faf52ea2bbd6ab68f65b1))
* **domain:** add allergen value object with 14 common types ([a3c2c86](https://github.com/Endika/EventSplit/commit/a3c2c868b15cb13ec842e48cb6cc61dba0b1228a))
* **domain:** add allergy checker with en/es keyword detection ([bbc3f5a](https://github.com/Endika/EventSplit/commit/bbc3f5a438c14d05371af5f5ed18b5d439ca21ff))
* **domain:** extend user entity with profile fields and allergies ([6ef277a](https://github.com/Endika/EventSplit/commit/6ef277a4e950a1578d009bcf3d9cec0c32f300a0))
* **ui:** add doodle-style availability tab with matrix ([e8c2621](https://github.com/Endika/EventSplit/commit/e8c26215314b1b5a55ad43ace3018d0a88de072e))
* **ui:** add location tab with maps link and event details ([7e9efe4](https://github.com/Endika/EventSplit/commit/7e9efe46a1dd330c385603990652dc60a89c0f10))
* **ui:** add profile editor with allergies and editable own card ([946262a](https://github.com/Endika/EventSplit/commit/946262ae45c6c2fe4a4d7d917a4057e257fc6663))
* **ui:** show allergy alert when adding purchases ([fad091d](https://github.com/Endika/EventSplit/commit/fad091d60885fdb020d790cba80cbd4d71cb394e))
* **ui:** wire availability and location tabs in event nav ([6e0a571](https://github.com/Endika/EventSplit/commit/6e0a57161f9ada007c5dcd7a9b833192f59cfcd8))


### Chores

* **infra:** register slice 2 handlers in container ([07214d3](https://github.com/Endika/EventSplit/commit/07214d3f63129fefc58b2d2d8e2b52ed09071474))

## [1.2.0](https://github.com/Endika/EventSplit/compare/v1.1.0...v1.2.0) (2026-05-26)


### Features

* **ui:** show app version in footer ([63558f1](https://github.com/Endika/EventSplit/commit/63558f18197dece44f1b6d7faf69ddf8287ae2cb))

## [1.1.0](https://github.com/Endika/EventSplit/compare/v1.0.1...v1.1.0) (2026-05-26)


### Features

* **pwa:** add es monogram icon and update theme colors ([759ef00](https://github.com/Endika/EventSplit/commit/759ef00d526c29f13835310ba1ea9aa2f74cceb3))
* **ui:** apply dark mode with violet teal gradient accent ([110745b](https://github.com/Endika/EventSplit/commit/110745b29670e31dfe9f2c876d64b73c2e6ef1cd))

## [1.0.1](https://github.com/Endika/EventSplit/compare/v1.0.0...v1.0.1) (2026-05-25)


### Documentation

* add readme matching sister-apps template ([46d79dd](https://github.com/Endika/EventSplit/commit/46d79dd4afae513e6ad470f7ab253d27e533d306))

## 1.0.0 (2026-05-25)


### Features

* add di container and i18n shell (en/es/eu) ([55de507](https://github.com/Endika/EventSplit/commit/55de5075c00a8a3e2699036b0a54503fb0e07fad))
* **app:** add create-event and join-as-new-user handlers ([f4dd2b5](https://github.com/Endika/EventSplit/commit/f4dd2b55eae2a2649264617c21614af368213236))
* **app:** add expense handler and sync server-wins handler ([1fdc123](https://github.com/Endika/EventSplit/commit/1fdc1237aae4235ab433d2e7684e0e1cacaae4cb))
* **app:** add purchase handler with consumer validation ([29e64a4](https://github.com/Endika/EventSplit/commit/29e64a49797da267ddbbcd5ed81f9113a5be163e))
* **app:** add zod schemas for create, join, purchase, expense ([76a2b08](https://github.com/Endika/EventSplit/commit/76a2b08d145339d6e3d107ec9e3d9665f2ab7917))
* **domain:** add event entity and history appender ([b9a9b6a](https://github.com/Endika/EventSplit/commit/b9a9b6a530aa85d302707cf525bb6718a49b6623))
* **domain:** add eventid and userid (uuid v7) value objects ([e4f6afb](https://github.com/Endika/EventSplit/commit/e4f6afb23782065aa21db16cad702a426102becd))
* **domain:** add expense entity ([cd4342a](https://github.com/Endika/EventSplit/commit/cd4342ad7f5647eb6f539db162a1fd987de4a6ee))
* **domain:** add expense splitter with balance and settlement ([8920d2e](https://github.com/Endika/EventSplit/commit/8920d2e426b2a6196610b40fa6e5d9f19826bc8e))
* **domain:** add money and multiplier value objects ([1ebae68](https://github.com/Endika/EventSplit/commit/1ebae685074fc425b2b4606b82138b624118f1ef))
* **domain:** add purchase entity with total-quantity calc ([d4d026c](https://github.com/Endika/EventSplit/commit/d4d026c8a17c2704f41c3a83e75101cebe68c6df))
* **domain:** add user entity with display-name rule ([ee389ad](https://github.com/Endika/EventSplit/commit/ee389ad8b89a7d4a4b4fff41d2ee5a02c15849bd))
* **infra:** add ievent-repository contract and in-memory impl ([0a158b9](https://github.com/Endika/EventSplit/commit/0a158b9d4b18da80d2e66f0cc3c7ab89d0afd770))
* **infra:** add localstorage cache for event and identity ([d76ecea](https://github.com/Endika/EventSplit/commit/d76ecea99f860ffc1e76abb276cdb9e28f539a41))
* **infra:** add online detector and container wiring ([1b8384a](https://github.com/Endika/EventSplit/commit/1b8384a13c5f53ec82b1481647d99f19c71b4482))
* **infra:** add realtime sync via supabase channels ([3ab662a](https://github.com/Endika/EventSplit/commit/3ab662ac5e3a06891947be6cf15ea5f97263e343))
* **infra:** add supabase client singleton ([f18b057](https://github.com/Endika/EventSplit/commit/f18b057a1b66db1102f5dd3dd67387cf8ccf795b))
* **infra:** add supabase event repository with optimistic lock ([1e5110f](https://github.com/Endika/EventSplit/commit/1e5110f08220896a3ba6797ac1a2b4b0ecf65b98))
* **pwa:** add manifest, service worker, auto-update banner ([bb8c38d](https://github.com/Endika/EventSplit/commit/bb8c38de5c24916a111de6c899481b7d875ac3fe))
* **ui:** add container, event, user, sync contexts ([fb57ba4](https://github.com/Endika/EventSplit/commit/fb57ba4263ee0f1373a4d4b74b00c89e1874b49a))
* **ui:** add expenses tab, form, and live settlement summary ([d99e28d](https://github.com/Endika/EventSplit/commit/d99e28dfe85ffc712088620eba9ba96470572715))
* **ui:** add home page, url routing, event page stub ([5d2a6e9](https://github.com/Endika/EventSplit/commit/5d2a6e946e4f07db7e803d45f6b95f9ee3cd5658))
* **ui:** add offline banner and disable writes when offline ([b4503c4](https://github.com/Endika/EventSplit/commit/b4503c431ff8b4c6881ee592724e6c5fdb980c56))
* **ui:** add purchases tab with add-purchase form ([cce8f47](https://github.com/Endika/EventSplit/commit/cce8f478f81f837938c447356db8201d244a9531))
* **ui:** add tabs, participants tab with you-badge, realtime sync ([24563f7](https://github.com/Endika/EventSplit/commit/24563f79d690a83eed91284b16d4b8c1bb5737c4))
* **ui:** add you-label badge and common modal, button, input ([444f22f](https://github.com/Endika/EventSplit/commit/444f22ff4ccd927d4db5bff749fc8411d2a640ae))
* **ui:** mandatory blocking identification modal for non-creators ([b101d6d](https://github.com/Endika/EventSplit/commit/b101d6df5837c5c9162abec6fdbb61432bed1304))


### Chores

* add tailwind, eslint, prettier, commitlint, husky, vitest ([89d8b94](https://github.com/Endika/EventSplit/commit/89d8b947059a5789b4c715aa47ef7d9d9da7a42a))
* configure gitignore, env scaffolding, env type defs ([afc9503](https://github.com/Endika/EventSplit/commit/afc950335ce23668d344cbc6513f8f406eb8fdae))
* drop inert .eslintrc.cjs (eslint v10 uses flat config) ([4509495](https://github.com/Endika/EventSplit/commit/45094957b8895cd1c73721af01120e490b751e94))
* scaffold vite + react + typescript strict ([22a78b6](https://github.com/Endika/EventSplit/commit/22a78b6a031f5cff9b7131950366bdfbe6f84a79))
