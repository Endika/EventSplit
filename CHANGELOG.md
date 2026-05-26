# Changelog

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
