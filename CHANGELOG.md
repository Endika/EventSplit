# Changelog

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
