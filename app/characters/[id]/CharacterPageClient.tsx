'use client';

import * as React from 'react';

type NamedThing = { id: string; name: string; shortDescription: string };

const PREDEFINED_SKILLS = [
  'Athleticism',
  'Awareness',
  'Connections',
  'Deception',
  'Driving',
  'Engineering',
  'Explosives',
  'Hacking',
  'Influence',
  'Intimidation',
  'Investigation',
  'Marksmanship',
  'Martial Arts',
  'Medicine',
  'Melee Combat',
  'Piloting',
  'Seduction',
  'Stealth',
  'Street Smarts',
  'Tracking',
] as const;

function isPredefinedSkill(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return PREDEFINED_SKILLS.some((s) => s.toLowerCase() === lower);
}

type Character = {
  id: string;
  name: string;
  isPublic: boolean;
  canEdit: boolean;
  speed: number;
  hitPoints: number;
  campaign: { id: string; name: string } | null;
  stats: {
    brawn: number;
    charm: number;
    intelligence: number;
    reflexes: number;
    tech: number;
    luck: number;
  };
  skills: Array<{ name: string; level: number }>;
  cybernetics: Array<{
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    price: number;
    batteryLife: number;
    statBonuses: Array<{ stat: string; amount: number }>;
    skillBonuses: Array<{ name: string; amount: number }>;
  }>;
  weapons: Array<{
    id: string;
    name: string;
    price: number;
    weight: number;
    maxRange: number;
    maxAmmoCount: number;
    type: string;
    condition: number;
    shortDescription: string;
    longDescription: string;
  }>;
  items: Array<{
    id: string;
    name: string;
    price: number;
    weight: number;
    type: string;
    shortDescription: string;
    longDescription: string;
  }>;
  vehicles: Array<{
    id: string;
    name: string;
    price: number;
    speed: number;
    armor: number;
    shortDescription: string;
    longDescription: string;
  }>;
};

async function graphQLFetch<T>(input: { query: string; variables?: Record<string, unknown> }): Promise<T> {
  const response = await fetch('/api/graphql', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ query: input.query, variables: input.variables }),
  });

  const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!response.ok || body.errors?.length || !body.data) {
    const message = body.errors?.map((e) => e.message).join('\n') ?? 'Request failed';
    throw new Error(message);
  }
  return body.data;
}

export function CharacterPageClient(props: { characterId: string }) {
  const [character, setCharacter] = React.useState<Character | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [editing, setEditing] = React.useState(false);

  const [allCybernetics, setAllCybernetics] = React.useState<NamedThing[]>([]);
  const [allWeapons, setAllWeapons] = React.useState<NamedThing[]>([]);
  const [allItems, setAllItems] = React.useState<NamedThing[]>([]);

  const [draftName, setDraftName] = React.useState('');
  const [draftStats, setDraftStats] = React.useState<Character['stats']>({
    brawn: 0,
    charm: 0,
    intelligence: 0,
    reflexes: 0,
    tech: 0,
    luck: 0,
  });

  const [skillLevels, setSkillLevels] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(PREDEFINED_SKILLS.map((name) => [name, 0])),
  );
  const [customSkills, setCustomSkills] = React.useState<Array<{ id: string; name: string; level: number }>>([]);

  const [cyberneticIds, setCyberneticIds] = React.useState<Set<string>>(() => new Set());
  const [weaponIds, setWeaponIds] = React.useState<Set<string>>(() => new Set());
  const [itemIds, setItemIds] = React.useState<Set<string>>(() => new Set());

  const randomId = React.useCallback((): string => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }, []);

  const toggleId = React.useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, checked: boolean) => {
    setter((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
    },
    [],
  );

  const resetDraftsFromCharacter = React.useCallback(
    (next: Character) => {
      setDraftName(next.name);
      setDraftStats(next.stats);

      const levels: Record<string, number> = Object.fromEntries(PREDEFINED_SKILLS.map((name) => [name, 0]));
      const custom: Array<{ id: string; name: string; level: number }> = [];
      for (const skill of next.skills ?? []) {
        if (isPredefinedSkill(skill.name)) {
          const match = PREDEFINED_SKILLS.find((s) => s.toLowerCase() === skill.name.toLowerCase());
          if (match) levels[match] = skill.level;
        } else {
          custom.push({ id: randomId(), name: skill.name, level: skill.level });
        }
      }
      setSkillLevels(levels);
      setCustomSkills(custom);

      setCyberneticIds(new Set((next.cybernetics ?? []).map((c) => c.id)));
      setWeaponIds(new Set((next.weapons ?? []).map((w) => w.id)));
      setItemIds(new Set((next.items ?? []).map((i) => i.id)));
    },
    [randomId],
  );

  React.useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);

    (async () => {
      try {
        const data = await graphQLFetch<{
          characters: Character[];
          allCybernetics: NamedThing[];
          allWeapons: NamedThing[];
          allItems: NamedThing[];
        }>({
          query: /* GraphQL */ `
            query CharacterDetail {
              characters {
                id
                name
                isPublic
                canEdit
                speed
                hitPoints
                campaign {
                  id
                  name
                }
                stats {
                  brawn
                  charm
                  intelligence
                  reflexes
                  tech
                  luck
                }
                skills {
                  name
                  level
                }
                cybernetics {
                  id
                  name
                  shortDescription
                  longDescription
                  price
                  batteryLife
                  statBonuses {
                    stat
                    amount
                  }
                  skillBonuses {
                    name
                    amount
                  }
                }
                weapons {
                  id
                  name
                  price
                  weight
                  maxRange
                  maxAmmoCount
                  type
                  condition
                  shortDescription
                  longDescription
                }
                items {
                  id
                  name
                  price
                  weight
                  type
                  shortDescription
                  longDescription
                }
                vehicles {
                  id
                  name
                  price
                  speed
                  armor
                  shortDescription
                  longDescription
                }
              }

              allCybernetics: cybernetics {
                id
                name
                shortDescription
              }
              allWeapons: weapons {
                id
                name
                shortDescription
              }
              allItems: items {
                id
                name
                shortDescription
              }
            }
          `,
        });

        if (cancelled) return;
        setAllCybernetics(data.allCybernetics);
        setAllWeapons(data.allWeapons);
        setAllItems(data.allItems);
        const found = data.characters.find((c) => c.id === props.characterId) ?? null;
        setCharacter(found);
        if (found) resetDraftsFromCharacter(found);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Request failed');
        setCharacter(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.characterId, resetDraftsFromCharacter]);

  if (busy) return <p>Loading character…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (!character) return <p>Character not found.</p>;

  async function saveEdits() {
    if (!character) return;
    const nextName = draftName.trim();
    if (!nextName) {
      setError('Invalid character name');
      return;
    }

    function toInt(value: unknown): number | null {
      if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : null;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const n = Number(trimmed);
        if (!Number.isFinite(n)) return null;
        return Math.trunc(n);
      }
      return null;
    }

    const stats = {
      brawn: toInt(draftStats.brawn),
      charm: toInt(draftStats.charm),
      intelligence: toInt(draftStats.intelligence),
      reflexes: toInt(draftStats.reflexes),
      tech: toInt(draftStats.tech),
      luck: toInt(draftStats.luck),
    };

    for (const [key, value] of Object.entries(stats)) {
      if (value === null || value < 0 || value > 10) {
        setError(`Invalid stat: ${key}`);
        return;
      }
    }

    const predefinedSkillsOut = PREDEFINED_SKILLS.map((name) => ({ name, level: skillLevels[name] ?? 0 })).filter(
      (s) => s.level > 0,
    );
    const customSkillsOut = customSkills
      .map((s) => ({ name: s.name.trim(), level: s.level }))
      .filter((s) => s.name.length > 0);
    const skillsOut = [...predefinedSkillsOut, ...customSkillsOut];

    setBusy(true);
    setError(null);
    try {
      const data = await graphQLFetch<{ updateCharacter: Character }>({
        query: /* GraphQL */ `
          mutation UpdateCharacter(
            $id: ID!
            $name: String!
            $stats: StatsInput
            $skills: [SkillInput!]
            $cyberneticIds: [ID!]
            $weaponIds: [ID!]
            $itemIds: [ID!]
          ) {
            updateCharacter(
              id: $id
              name: $name
              stats: $stats
              skills: $skills
              cyberneticIds: $cyberneticIds
              weaponIds: $weaponIds
              itemIds: $itemIds
            ) {
              id
              name
              isPublic
              canEdit
              speed
              hitPoints
              campaign {
                id
                name
              }
              stats {
                brawn
                charm
                intelligence
                reflexes
                tech
                luck
              }
              skills {
                name
                level
              }
              cybernetics {
                id
                name
                shortDescription
                longDescription
                price
                batteryLife
                statBonuses {
                  stat
                  amount
                }
                skillBonuses {
                  name
                  amount
                }
              }
              weapons {
                id
                name
                price
                weight
                maxRange
                maxAmmoCount
                type
                condition
                shortDescription
                longDescription
              }
              items {
                id
                name
                price
                weight
                type
                shortDescription
                longDescription
              }
              vehicles {
                id
                name
                price
                speed
                armor
                shortDescription
                longDescription
              }
            }
          }
        `,
        variables: {
          id: character.id,
          name: nextName,
          stats,
          skills: skillsOut,
          cyberneticIds: [...cyberneticIds],
          weaponIds: [...weaponIds],
          itemIds: [...itemIds],
        },
      });

      setCharacter(data.updateCharacter);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h3>{character.name}</h3>
      <p>{character.campaign?.name ?? (character.isPublic ? 'Archetype' : 'No campaign')}</p>

      {character.canEdit ? (
        <p>
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                  resetDraftsFromCharacter(character);
                }}
                disabled={busy}
              >
                Cancel
              </button>{' '}
              <button type="button" onClick={saveEdits} disabled={busy}>
                Save
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setError(null);
                resetDraftsFromCharacter(character);
              }}
              disabled={busy}
            >
              Edit
            </button>
          )}
        </p>
      ) : null}

      {editing ? (
        <>
          <section>
            <h2>Name</h2>
            <label>
              Name
              <input value={draftName} onChange={(e) => setDraftName(e.target.value)} />
            </label>
          </section>

          <section>
            <h2>Stats</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
              <label>
                Brawn
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={draftStats.brawn}
                  onChange={(e) =>
                    setDraftStats((s) => ({
                      ...s,
                      brawn: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Charm
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={draftStats.charm}
                  onChange={(e) =>
                    setDraftStats((s) => ({
                      ...s,
                      charm: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Intelligence
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={draftStats.intelligence}
                  onChange={(e) =>
                    setDraftStats((s) => ({
                      ...s,
                      intelligence: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Reflexes
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={draftStats.reflexes}
                  onChange={(e) =>
                    setDraftStats((s) => ({
                      ...s,
                      reflexes: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Tech
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={draftStats.tech}
                  onChange={(e) =>
                    setDraftStats((s) => ({
                      ...s,
                      tech: Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Luck
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={draftStats.luck}
                  onChange={(e) =>
                    setDraftStats((s) => ({
                      ...s,
                      luck: Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>
          </section>

          <section>
            <h2>Skills</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
              {PREDEFINED_SKILLS.map((skillName) => (
                <label key={skillName}>
                  {skillName}
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={1}
                    value={skillLevels[skillName] ?? 0}
                    onChange={(e) => setSkillLevels((prev) => ({ ...prev, [skillName]: Number(e.target.value) }))}
                  />
                </label>
              ))}
            </div>

            <h3 style={{ marginTop: 16 }}>Custom skills</h3>
            {customSkills.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {customSkills.map((row) => (
                  <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: 8, alignItems: 'end' }}>
                    <input
                      value={row.name}
                      placeholder="Name"
                      aria-label="Name"
                      onChange={(e) =>
                        setCustomSkills((prev) => prev.map((s) => (s.id === row.id ? { ...s, name: e.target.value } : s)))
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={1}
                      value={row.level}
                      placeholder="Level"
                      aria-label="Level"
                      onChange={(e) =>
                        setCustomSkills((prev) => prev.map((s) => (s.id === row.id ? { ...s, level: Number(e.target.value) } : s)))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setCustomSkills((prev) => prev.filter((s) => s.id !== row.id))}
                      disabled={busy}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>None.</p>
            )}
            <p>
              <button
                type="button"
                onClick={() => setCustomSkills((prev) => [...prev, { id: randomId(), name: '', level: 0 }])}
                disabled={busy}
              >
                Add custom skill
              </button>
            </p>
          </section>

          <section>
            <h2>Cybernetics</h2>
            {allCybernetics.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                {allCybernetics.map((c) => (
                  <label key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <input
                      type="checkbox"
                      checked={cyberneticIds.has(c.id)}
                      onChange={(e) => toggleId(setCyberneticIds, c.id, e.target.checked)}
                      aria-label={c.name}
                      disabled={busy}
                    />
                    <span>
                      <strong>{c.name}</strong> — {c.shortDescription}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p>None.</p>
            )}
          </section>

          <section>
            <h2>Weapons</h2>
            {allWeapons.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                {allWeapons.map((w) => (
                  <label key={w.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <input
                      type="checkbox"
                      checked={weaponIds.has(w.id)}
                      onChange={(e) => toggleId(setWeaponIds, w.id, e.target.checked)}
                      aria-label={w.name}
                      disabled={busy}
                    />
                    <span>
                      <strong>{w.name}</strong> — {w.shortDescription}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p>None.</p>
            )}
          </section>

          <section>
            <h2>Items</h2>
            {allItems.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                {allItems.map((i) => (
                  <label key={i.id} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <input
                      type="checkbox"
                      checked={itemIds.has(i.id)}
                      onChange={(e) => toggleId(setItemIds, i.id, e.target.checked)}
                      aria-label={i.name}
                      disabled={busy}
                    />
                    <span>
                      <strong>{i.name}</strong> — {i.shortDescription}
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p>None.</p>
            )}
          </section>
        </>
      ) : null}

      {!editing ? (
        <section>
          <h2>Stats</h2>
          <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
            <li>Speed: {character.speed}</li>
            <li>Hit Points: {character.hitPoints}</li>
            <li>Brawn: {character.stats.brawn}</li>
            <li>Charm: {character.stats.charm}</li>
            <li>Intelligence: {character.stats.intelligence}</li>
            <li>Reflexes: {character.stats.reflexes}</li>
            <li>Tech: {character.stats.tech}</li>
            <li>Luck: {character.stats.luck}</li>
          </ul>
        </section>
      ) : null}

      {!editing ? (
        <section>
          <h2>Skills</h2>
          {character.skills.length ? (
            <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
              {character.skills.map((skill) => (
                <li key={skill.name}>
                  {skill.name}: {skill.level}
                </li>
              ))}
            </ul>
          ) : (
            <p>None.</p>
          )}
        </section>
      ) : null}

      {!editing ? (
        <section>
          <h2>Cybernetics</h2>
          {character.cybernetics.length ? (
            <ul>
              {character.cybernetics.map((cybernetic) => (
                <li key={cybernetic.id}>
                  <strong>{cybernetic.name}</strong> — {cybernetic.shortDescription}
                  <ul>
                    <li>Price: {cybernetic.price}</li>
                    <li>Battery life: {cybernetic.batteryLife}</li>
                    <li>{cybernetic.longDescription}</li>
                    {cybernetic.statBonuses.length ? (
                      <li>
                        Stat bonuses: {cybernetic.statBonuses.map((b) => `${b.stat}+${b.amount}`).join(', ')}
                      </li>
                    ) : null}
                    {cybernetic.skillBonuses.length ? (
                      <li>
                        Skill bonuses: {cybernetic.skillBonuses.map((b) => `${b.name}+${b.amount}`).join(', ')}
                      </li>
                    ) : null}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p>None.</p>
          )}
        </section>
      ) : null}

      {!editing ? (
        <section>
          <h2>Weapons</h2>
          {character.weapons.length ? (
            <ul>
              {character.weapons.map((weapon) => (
                <li key={weapon.id}>
                  <strong>{weapon.name}</strong> — {weapon.shortDescription}
                  <ul>
                    <li>Type: {weapon.type}</li>
                    <li>Price: {weapon.price}</li>
                    <li>Weight: {weapon.weight}</li>
                    <li>Range: {weapon.maxRange}</li>
                    <li>Max ammo: {weapon.maxAmmoCount}</li>
                    <li>Condition: {weapon.condition}</li>
                    <li>{weapon.longDescription}</li>
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p>None.</p>
          )}
        </section>
      ) : null}

      {!editing ? (
        <section>
          <h2>Items</h2>
          {character.items.length ? (
            <ul>
              {character.items.map((item) => (
                <li key={item.id}>
                  <strong>{item.name}</strong> — {item.shortDescription}
                  <ul>
                    <li>Type: {item.type}</li>
                    <li>Price: {item.price}</li>
                    <li>Weight: {item.weight}</li>
                    <li>{item.longDescription}</li>
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p>None.</p>
          )}
        </section>
      ) : null}

      <section>
        <h2>Vehicles</h2>
        {character.vehicles.length ? (
          <ul>
            {character.vehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <strong>{vehicle.name}</strong> — {vehicle.shortDescription}
                <ul>
                  <li>Price: {vehicle.price}</li>
                  <li>Speed: {vehicle.speed}</li>
                  <li>Armor: {vehicle.armor}</li>
                  <li>{vehicle.longDescription}</li>
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p>None.</p>
        )}
      </section>
    </>
  );
}
