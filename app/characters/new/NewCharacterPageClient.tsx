'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Notices, TooltipNotice, useNotices } from '../../ui/notices';
import { Select } from '../../ui/Select';

type Campaign = { id: string; name: string };

type NamedThing = { id: string; name: string };

type FormQuery = {
  campaigns: Campaign[];
  cybernetics: NamedThing[];
  weapons: NamedThing[];
  items: NamedThing[];
  vehicles: NamedThing[];
};

type CreateCharacterMutation = { createCharacter: { id: string } };

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

export function NewCharacterPageClient() {
  const router = useRouter();
  const [campaigns, setCampaigns] = React.useState<Campaign[]>([]);
  const [cybernetics, setCybernetics] = React.useState<NamedThing[]>([]);
  const [weapons, setWeapons] = React.useState<NamedThing[]>([]);
  const [items, setItems] = React.useState<NamedThing[]>([]);
  const [vehicles, setVehicles] = React.useState<NamedThing[]>([]);

  const [campaignId, setCampaignId] = React.useState<string>('');
  const [name, setName] = React.useState('');

  const [stats, setStats] = React.useState({
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

  const [savedCustomSkillNames, setSavedCustomSkillNames] = React.useState<string[]>([]);
  const [customSkills, setCustomSkills] = React.useState<Array<{ id: string; name: string; level: number }>>([]);

  const [createTooltipError, setCreateTooltipError] = React.useState<string | null>(null);
  const [customSkillTooltipErrors, setCustomSkillTooltipErrors] = React.useState<Record<string, string | null>>({});

  const [cyberneticIds, setCyberneticIds] = React.useState<Set<string>>(() => new Set());
  const [weaponIds, setWeaponIds] = React.useState<Set<string>>(() => new Set());
  const [itemIds, setItemIds] = React.useState<Set<string>>(() => new Set());
  const [vehicleIds, setVehicleIds] = React.useState<Set<string>>(() => new Set());

  const [busy, setBusy] = React.useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = React.useState(true);
  const notices = useNotices();

  function randomId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  React.useEffect(() => {
    let cancelled = false;
    setLoadingCampaigns(true);
    notices.clear();

    (async () => {
      try {
        const data = await graphQLFetch<FormQuery>({
          query: /* GraphQL */ `
            query NewCharacterForm {
              campaigns {
                id
                name
              }
              cybernetics {
                id
                name
              }
              weapons {
                id
                name
              }
              items {
                id
                name
              }
              vehicles {
                id
                name
              }
            }
          `,
        });

        if (cancelled) return;
        setCampaigns(data.campaigns);
        setCybernetics(data.cybernetics);
        setWeapons(data.weapons);
        setItems(data.items);
        setVehicles(data.vehicles);
      } catch (e) {
        if (cancelled) return;
        notices.setFromError(e);
      } finally {
        if (!cancelled) setLoadingCampaigns(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [notices.clear, notices.setFromError]);

  function clampInt(value: string): number {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(10, parsed));
  }

  const canonicalizeIfPredefined = React.useCallback((name: string): string => {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    const match = PREDEFINED_SKILLS.find((s) => s.toLowerCase() === trimmed.toLowerCase());
    return match ?? trimmed;
  }, []);

  const allSkillNames = React.useMemo(() => {
    const out: string[] = [...PREDEFINED_SKILLS];
    const seen = new Set(out.map((s) => s.toLowerCase()));
    for (const name of savedCustomSkillNames) {
      const canonical = canonicalizeIfPredefined(name);
      const key = canonical.toLowerCase();
      if (seen.has(key)) continue;
      out.push(canonical);
      seen.add(key);
    }
    return out;
  }, [canonicalizeIfPredefined, savedCustomSkillNames]);

  function isPredefinedSkill(name: string): boolean {
    const lower = name.toLowerCase();
    return PREDEFINED_SKILLS.some((s) => s.toLowerCase() === lower);
  }

  function findDuplicateSkillNames(skillNames: string[]): string[] {
    const counts = new Map<string, { name: string; count: number }>();
    for (const name of skillNames) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      const canonical = canonicalizeIfPredefined(trimmed);
      const key = canonical.toLowerCase();
      const prev = counts.get(key);
      counts.set(key, { name: prev?.name ?? canonical, count: (prev?.count ?? 0) + 1 });
    }
    return [...counts.values()].filter((v) => v.count > 1).map((v) => v.name);
  }

  function toggleId(setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string, checked: boolean) {
    setter((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function onCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;

    setBusy(true);
    notices.clear();
    setCreateTooltipError(null);

    try {
      const customSkillsTrimmed = customSkills
        .map((s) => ({ name: canonicalizeIfPredefined(s.name), level: s.level }))
        .filter((s) => s.name.length > 0);

      const duplicateNames = findDuplicateSkillNames([
        ...allSkillNames,
        ...customSkillsTrimmed.map((s) => s.name),
      ]);

      if (duplicateNames.length) {
        setCreateTooltipError(`Duplicate skills are not allowed: ${duplicateNames.join(', ')}`);
        return;
      }

      const customOverlaps = customSkillsTrimmed
        .map((s) => s.name)
        .filter((n) => allSkillNames.some((existing) => existing.toLowerCase() === n.toLowerCase()));

      if (customOverlaps.length) {
        setCreateTooltipError(`Duplicate skills are not allowed: ${customOverlaps.join(', ')}`);
        return;
      }

      const predefinedSkillsOut = allSkillNames
        .map((skillName) => ({
          name: skillName,
          level: skillLevels[skillName] ?? 0,
        }))
        .filter((s) => s.level > 0);

      const customSkillsOut = customSkillsTrimmed;

      const skillsOut = [...predefinedSkillsOut, ...customSkillsOut];

      const data = await graphQLFetch<CreateCharacterMutation>({
        query: /* GraphQL */ `
          mutation CreateCharacter(
            $campaignId: ID
            $name: String!
            $stats: StatsInput
            $skills: [SkillInput!]
            $cyberneticIds: [ID!]
            $weaponIds: [ID!]
            $itemIds: [ID!]
            $vehicleIds: [ID!]
          ) {
            createCharacter(
              campaignId: $campaignId
              name: $name
              stats: $stats
              skills: $skills
              cyberneticIds: $cyberneticIds
              weaponIds: $weaponIds
              itemIds: $itemIds
              vehicleIds: $vehicleIds
            ) {
              id
            }
          }
        `,
        variables: {
          campaignId: campaignId.trim() ? campaignId : null,
          name: trimmed,
          stats,
          skills: skillsOut,
          cyberneticIds: [...cyberneticIds],
          weaponIds: [...weaponIds],
          itemIds: [...itemIds],
          vehicleIds: [...vehicleIds],
        },
      });

      router.push(`/characters/${data.createCharacter.id}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Request failed';
      setCreateTooltipError(message);
    } finally {
      setBusy(false);
    }
  }

  function newCustomSkillRow() {
    return { id: randomId(), name: '', level: 0 };
  }

  if (loadingCampaigns) return <p>Loading campaigns…</p>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void onCreate();
      }}
    >
      <Notices notices={notices.notices} onDismiss={notices.remove} />

      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
      </label>

      <Select
        label="Campaign"
        ariaLabel="Campaign"
        value={campaignId}
        disabled={busy}
        options={[{ value: '', label: '(No campaign)' }, ...campaigns.map((c) => ({ value: c.id, label: c.name }))]}
        onChange={setCampaignId}
      />

      <h3 style={{ marginTop: 18 }}>Stats</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          alignItems: 'end',
        }}
      >
        <label>
          Brawn
          <input
            type="number"
            min={0}
            max={10}
            value={stats.brawn}
            onChange={(e) => setStats((prev) => ({ ...prev, brawn: clampInt(e.target.value) }))}
            disabled={busy}
          />
        </label>
        <label>
          Charm
          <input
            type="number"
            min={0}
            max={10}
            value={stats.charm}
            onChange={(e) => setStats((prev) => ({ ...prev, charm: clampInt(e.target.value) }))}
            disabled={busy}
          />
        </label>
        <label>
          Intelligence
          <input
            type="number"
            min={0}
            max={10}
            value={stats.intelligence}
            onChange={(e) => setStats((prev) => ({ ...prev, intelligence: clampInt(e.target.value) }))}
            disabled={busy}
          />
        </label>
        <label>
          Reflexes
          <input
            type="number"
            min={0}
            max={10}
            value={stats.reflexes}
            onChange={(e) => setStats((prev) => ({ ...prev, reflexes: clampInt(e.target.value) }))}
            disabled={busy}
          />
        </label>
        <label>
          Tech
          <input
            type="number"
            min={0}
            max={10}
            value={stats.tech}
            onChange={(e) => setStats((prev) => ({ ...prev, tech: clampInt(e.target.value) }))}
            disabled={busy}
          />
        </label>
        <label>
          Luck
          <input
            type="number"
            min={0}
            max={10}
            value={stats.luck}
            onChange={(e) => setStats((prev) => ({ ...prev, luck: clampInt(e.target.value) }))}
            disabled={busy}
          />
        </label>
      </div>

      <h3 style={{ marginTop: 18 }}>Skills</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
          alignItems: 'end',
        }}
      >
        {allSkillNames.map((skillName) => {
          const isCustom = !isPredefinedSkill(skillName);
          return (
            <div key={skillName}>
              <label>
                {skillName}
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={skillLevels[skillName] ?? 0}
                    onChange={(e) => setSkillLevels((prev) => ({ ...prev, [skillName]: clampInt(e.target.value) }))}
                    disabled={busy}
                    style={{ width: '100%', ...(isCustom ? { paddingRight: 34 } : null) }}
                  />

                  {isCustom ? (
                    <button
                      type="button"
                      data-icon-button="true"
                      aria-label={`Remove skill ${skillName}`}
                      title="Remove"
                      disabled={busy}
                      onClick={() => {
                        setSavedCustomSkillNames((prev) =>
                          prev.filter((s) => s.toLowerCase() !== skillName.toLowerCase()),
                        );
                        setSkillLevels((prev) => {
                          const next = { ...prev };
                          delete next[skillName];
                          return next;
                        });
                      }}
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        width: 20,
                        height: 20,
                        padding: 0,
                        marginTop: 0,
                        lineHeight: 1,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              </label>
            </div>
          );
        })}
      </div>

      <p>
        <button
          type="button"
          onClick={() =>
            setCustomSkills((prev) =>
              savedCustomSkillNames.length + prev.length >= 5 ? prev : [...prev, newCustomSkillRow()],
            )
          }
          disabled={busy || savedCustomSkillNames.length + customSkills.length >= 5}
        >
          Add new skill
        </button>
      </p>

      {customSkills.length ? <h3>Custom skills</h3> : null}
      {customSkills.map((skill, index) => (
        <div
          key={skill.id}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            alignItems: 'end',
          }}
        >
          <label>
            Skill name
            <input
              aria-label={`Custom skill ${index + 1} name`}
              value={skill.name}
              onChange={(e) =>
                setCustomSkills((prev) => {
                  const next = [...prev];
                  next[index] = { ...next[index], name: e.target.value };
                  return next;
                })
              }
              onInput={() => setCustomSkillTooltipErrors((prev) => ({ ...prev, [skill.id]: null }))}
              disabled={busy}
            />
          </label>
          <label>
            Skill level
            <input
              aria-label={`Custom skill ${index + 1} level`}
              type="number"
              min={0}
              max={10}
              value={skill.level}
              onChange={(e) =>
                setCustomSkills((prev) => {
                  const next = [...prev];
                  next[index] = { ...next[index], level: clampInt(e.target.value) };
                  return next;
                })
              }
              onInput={() => setCustomSkillTooltipErrors((prev) => ({ ...prev, [skill.id]: null }))}
              disabled={busy}
            />
          </label>
          <p style={{ margin: 0 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                maxWidth: '100%',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                aria-label={`Save custom skill ${index + 1}`}
                disabled={busy}
                style={{ flex: '0 0 auto' }}
                onClick={() => {
                  setCustomSkillTooltipErrors((prev) => ({ ...prev, [skill.id]: null }));
                  setCreateTooltipError(null);

                  const canonical = canonicalizeIfPredefined(skill.name);
                  if (!canonical) return;

                  const key = canonical.toLowerCase();
                  const existsInPredefined = PREDEFINED_SKILLS.some((s) => s.toLowerCase() === key);
                  const existsInSaved = savedCustomSkillNames.some((s) => s.toLowerCase() === key);

                  if (existsInPredefined || existsInSaved) {
                    setCustomSkillTooltipErrors((prev) => ({
                      ...prev,
                      [skill.id]: `Duplicate skills are not allowed: ${canonical}`,
                    }));
                    return;
                  }

                  const existsInOtherCustom = customSkills.some((s, i) => {
                    if (i === index) return false;
                    const other = canonicalizeIfPredefined(s.name);
                    return other.toLowerCase() === key;
                  });

                  if (existsInOtherCustom) {
                    setCustomSkillTooltipErrors((prev) => ({
                      ...prev,
                      [skill.id]: `Duplicate skills are not allowed: ${canonical}`,
                    }));
                    return;
                  }

                  if (savedCustomSkillNames.length >= 5) return;

                  setSkillLevels((prev) => {
                    const current = prev[canonical] ?? prev[skill.name] ?? 0;
                    const nextLevel = skill.level ?? 0;
                    return { ...prev, [canonical]: Math.max(current, nextLevel) };
                  });

                  setSavedCustomSkillNames((prev) => [...prev, canonical]);
                  setCustomSkills((prev) => prev.filter((_s, i) => i !== index));
                }}
              >
                Save
              </button>
              <TooltipNotice message={customSkillTooltipErrors[skill.id] ?? null} />
            </span>
          </p>
        </div>
      ))}

      <h3>Cybernetics</h3>
      {cybernetics.length ? (
        <div>
          {cybernetics.map((c) => (
            <label key={c.id}>
              <input
                type="checkbox"
                checked={cyberneticIds.has(c.id)}
                onChange={(e) => toggleId(setCyberneticIds, c.id, e.target.checked)}
                disabled={busy}
              />
              {c.name}
            </label>
          ))}
        </div>
      ) : (
        <p>None.</p>
      )}

      <h3>Weapons</h3>
      {weapons.length ? (
        <div>
          {weapons.map((w) => (
            <label key={w.id}>
              <input
                type="checkbox"
                checked={weaponIds.has(w.id)}
                onChange={(e) => toggleId(setWeaponIds, w.id, e.target.checked)}
                disabled={busy}
              />
              {w.name}
            </label>
          ))}
        </div>
      ) : (
        <p>None.</p>
      )}

      <h3>Items</h3>
      {items.length ? (
        <div>
          {items.map((it) => (
            <label key={it.id}>
              <input
                type="checkbox"
                checked={itemIds.has(it.id)}
                onChange={(e) => toggleId(setItemIds, it.id, e.target.checked)}
                disabled={busy}
              />
              {it.name}
            </label>
          ))}
        </div>
      ) : (
        <p>None.</p>
      )}

      <h3>Vehicles</h3>
      {vehicles.length ? (
        <div>
          {vehicles.map((v) => (
            <label key={v.id}>
              <input
                type="checkbox"
                checked={vehicleIds.has(v.id)}
                onChange={(e) => toggleId(setVehicleIds, v.id, e.target.checked)}
                disabled={busy}
              />
              {v.name}
            </label>
          ))}
        </div>
      ) : (
        <p>None.</p>
      )}

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: '100%',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="submit"
          aria-label="Create character"
          disabled={busy || !name.trim() || !campaignId}
          onClick={() => setCreateTooltipError(null)}
          style={{ flex: '0 0 auto' }}
        >
          {busy ? 'Creating…' : 'Create character'}
        </button>
        <TooltipNotice message={createTooltipError} />
      </div>

    </form>
  );
}
